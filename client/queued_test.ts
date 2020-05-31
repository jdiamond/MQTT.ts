import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { TestClient } from './test.ts';

Deno.test('connect/publish/disconnect without await', async () => {
  const client = new TestClient();

  client.connect();

  // Client immediately transitions to connecting state.
  assertEquals(client.connectionState, 'connecting');

  // Can still publish and disconnect.
  client.publish('topic1', 'payload1');
  client.disconnect();

  // Client is still in connecting state.
  assertEquals(client.connectionState, 'connecting');

  // Client has queued packets.
  assertEquals(client.queuedPackets.length, 1);
  assertEquals(client.queuedPackets[0].type, 'publish');

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 1);
  assertEquals(client.sentPackets[0].type, 'connect');
  assertEquals(client.connectionState, 'connecting');

  client.testReceivePacket({
    type: 'connack',
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, 'connected');

  // Sleep so the queued packets can be flushed and the connection closed.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 3);
  assertEquals(client.sentPackets[1].type, 'publish');
  assertEquals(client.sentPackets[2].type, 'disconnect');

  assertEquals(client.connectionState, 'disconnected');
});
