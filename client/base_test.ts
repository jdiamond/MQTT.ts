import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import BaseClient from './base.ts';
import { encode, decode, AnyPacket } from '../packets/mod.ts';

class TestClient extends BaseClient {
  writtenPackets: AnyPacket[] = [];
  timerCallbacks: { [key: string]: Function } = {};

  // These methods must be overridden by BaseClient subclasses:

  async open() {}

  async startReading() {}

  async write(bytes: Uint8Array) {
    const packet = decode(bytes);
    this.writtenPackets.push(packet!);
  }

  async close() {
    this.connectionClosed();
  }

  // This method is for tests to pretend to be a server sending packets to the client:

  receive(packet: AnyPacket) {
    this.bytesReceived(encode(packet));
  }

  // These methods are here to simulate timers without actually passing time:

  startTimer(name: string, cb: (...args: unknown[]) => void, _delay: number) {
    this.timerCallbacks[name] = cb;
  }

  stopTimer(_name: string) {}

  timerExists(name: string) {
    return !!this.timerCallbacks[name];
  }

  triggerTimer(name: string) {
    this.timerCallbacks[name]();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

Deno.test('connect/disconnect', async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await sleep(1);

  assertEquals(client.writtenPackets[0].type, 'connect');
  assertEquals(client.connectionState, 'waiting-for-connack');

  client.receive({
    type: 'connack',
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, 'connected');

  client.disconnect();

  assertEquals(client.connectionState, 'disconnecting');

  // Sleep a little to allow the disconnect packet to be sent.
  await sleep(1);

  assertEquals(client.writtenPackets[1].type, 'disconnect');
  assertEquals(client.connectionState, 'disconnected');
});

Deno.test('open throws', async () => {
  const client = new TestClient();

  client.open = async () => {
    throw new Error('nope');
  };

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await sleep(1);

  assertEquals(client.connectionState, 'connect-failed');

  // No connect packet should have been written.
  assertEquals(client.writtenPackets.length, 0);

  // Calling disconnect in the connect-failed state is a no-op
  // and transitions directly to the disconnected state.
  client.disconnect();

  assertEquals(client.connectionState, 'disconnected');

  // Sleep long enough for the disconnect packet to have been written.
  await sleep(1);

  // But no disconnect packet should have been written.
  assertEquals(client.writtenPackets.length, 0);
});

Deno.test('waiting for connack times out', async () => {
  const client = new TestClient({ connectTimeout: 5 });

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await sleep(1);

  // Now we see the connect packet was written.
  assertEquals(client.writtenPackets[0].type, 'connect');

  // And we are waiting for a connack packet.
  assertEquals(client.connectionState, 'waiting-for-connack');

  // This is when we should receive the connack packet.
  // Simulate time passing by manually triggering the connect timer.
  client.triggerTimer('connect');

  assertEquals(client.connectionState, 'connect-failed');

  // Calling disconnect in the connect-failed state is a no-op
  // and transitions directly to the disconnected state.
  client.disconnect();

  assertEquals(client.connectionState, 'disconnected');

  // Sleep long enough for the disconnect packet to have been written.
  await sleep(1);

  // But no disconnect packet should have been written.
  assertEquals(client.writtenPackets.length, 1);
});
