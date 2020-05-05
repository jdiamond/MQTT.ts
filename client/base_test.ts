import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import BaseClient from './base.ts';
import { encode, decode, AnyPacket } from '../packets/mod.ts';

class TestClient extends BaseClient {
  writtenPackets: AnyPacket[] = [];

  async open() {}

  async startReading() {}

  async write(bytes: Uint8Array) {
    const packet = decode(bytes);
    this.writtenPackets.push(packet!);
  }

  async close() {
    this.connectionClosed();
  }

  receive(packet: AnyPacket) {
    this.bytesReceived(encode(packet));
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

Deno.test('connect/disconnect', async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  await sleep(10);

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

  await sleep(10);

  assertEquals(client.connectionState, 'disconnected');
  assertEquals(client.writtenPackets[1].type, 'disconnect');
});

Deno.test('open throws', async () => {
  const client = new TestClient();

  client.open = async () => {
    throw new Error('nope');
  };

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  await sleep(1);

  assertEquals(client.connectionState, 'connect-failed');

  // No connect packet should have been written.
  assertEquals(client.writtenPackets.length, 0);

  // Calling disconnect in the connect-failed state is a no-op
  // and transitions directly to the disconnected state.
  client.disconnect();

  assertEquals(client.connectionState, 'disconnected');

  await sleep(10);

  // No disconnect packet should have been written.
  assertEquals(client.writtenPackets.length, 0);
});

Deno.test('waiting for connack times out', async () => {
  const client = new TestClient({ connectTimeout: 5 });

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to send a connect packet, but not long
  // enough to time out waiting for the connack packet.
  await sleep(1);

  // Now we see the connect packet was written.
  assertEquals(client.writtenPackets[0].type, 'connect');

  // And we are waiting for a connack packet.
  assertEquals(client.connectionState, 'waiting-for-connack');

  // This is when we should receive the connack packet.
  // Sleep past its timeout instead.
  await sleep(10);

  assertEquals(client.connectionState, 'connect-failed');

  // Calling disconnect in the connect-failed state is a no-op
  // and transitions directly to the disconnected state.
  client.disconnect();

  assertEquals(client.connectionState, 'disconnected');

  await sleep(10);

  // No disconnect packet should have been written.
  assertEquals(client.writtenPackets.length, 1);
});
