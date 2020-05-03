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

Deno.test({
  name: 'connect/disconnect',
  async fn() {
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
  },
});
