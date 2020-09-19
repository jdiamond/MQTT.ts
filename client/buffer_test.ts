import { assertEquals } from 'https://deno.land/std@0.70.0/testing/asserts.ts';
import { TestClient } from './test_client.ts';
import { PublishPacket, encode } from '../packets/mod.ts';

Deno.test('client can receive one byte at a time', async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[0].type, 'connect');
  assertEquals(client.connectionState, 'connecting');

  client.testReceivePacket(
    {
      type: 'connack',
      returnCode: 0,
      sessionPresent: false,
    },
    { trickle: true }
  );

  assertEquals(client.receivedPackets[0].type, 'connack');
  assertEquals(client.connectionState, 'connected');

  client.testReceivePacket(
    {
      type: 'publish',
      topic: 'test',
      payload: 'test',
    },
    { trickle: true }
  );

  assertEquals(client.receivedPackets[1].type, 'publish');

  const bytes = encode(
    {
      type: 'publish',
      topic: 'test2',
      payload: 'test2',
    },
    new TextEncoder()
  );

  // Receive all but the last byte:
  client.testReceiveBytes(bytes.slice(0, bytes.length - 1));
  // No new packets have been received:
  assertEquals(client.receivedPackets.length, 2);
  // Send the last byte:
  client.testReceiveBytes(bytes.slice(bytes.length - 1));
  // A new packet has been received:
  assertEquals(client.receivedPackets.length, 3);
  assertEquals(client.receivedPackets[2].type, 'publish');
});

Deno.test('client can receive bytes for multiple packets at once', async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[0].type, 'connect');
  assertEquals(client.connectionState, 'connecting');

  client.testReceivePacket({
    type: 'connack',
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.receivedPackets[0].type, 'connack');
  assertEquals(client.connectionState, 'connected');

  const bytes = Uint8Array.from([
    ...encode(
      {
        type: 'publish',
        topic: 'topic1',
        payload: 'payload1',
      },
      new TextEncoder()
    ),
    ...encode(
      {
        type: 'publish',
        topic: 'topic2',
        payload: 'payload2',
      },
      new TextEncoder()
    ),
  ]);

  client.testReceiveBytes(bytes);

  assertEquals(client.receivedPackets.length, 3);
  assertEquals(client.receivedPackets[1].type, 'publish');
  assertEquals((client.receivedPackets[1] as PublishPacket).topic, 'topic1');
  assertEquals(client.receivedPackets[2].type, 'publish');
  assertEquals((client.receivedPackets[2] as PublishPacket).topic, 'topic2');
});
