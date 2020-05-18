import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import {
  PublishPacket,
  SubscribePacket,
  UnsubscribePacket,
  encode,
} from '../packets/mod.ts';
import { TestClient } from './test.ts';

const utf8Encoder = new TextEncoder();

Deno.test('connect/disconnect', async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[0].type, 'connect');
  assertEquals(client.connectionState, 'waiting-for-connack');

  client.testReceivePacket({
    type: 'connack',
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, 'connected');

  client.disconnect();

  assertEquals(client.connectionState, 'disconnecting');

  // Sleep a little to allow the disconnect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[1].type, 'disconnect');
  assertEquals(client.connectionState, 'disconnected');
});

Deno.test('open throws, connect does not reject when retries > 0', async () => {
  const client = new TestClient({ openRejects: 1 });

  let connectRejected = false;

  client.connect().catch(() => {
    connectRejected = true;
  });

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow open to throw.
  await client.sleep(1);

  assertEquals(client.connectionState, 'offline');

  // No connect packet should have been written.
  assertEquals(client.sentPackets.length, 0);

  // The promise returned from connect should have rejected.
  assertEquals(connectRejected, false);

  // Calling disconnect in the offline state is a no-op and transitions directly
  // to the disconnected state.
  client.disconnect();

  assertEquals(client.connectionState, 'disconnected');

  // Sleep long enough for the disconnect packet to have been written.
  await client.sleep(1);

  // But no disconnect packet should have been written.
  assertEquals(client.sentPackets.length, 0);
});

Deno.test('open throws, connect rejects when retries is 0', async () => {
  const client = new TestClient({
    openRejects: 1,
    reconnect: { retries: 0 },
  });

  let connectRejected = false;

  client.connect().catch(() => {
    connectRejected = true;
  });

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow open to throw.
  await client.sleep(1);

  assertEquals(client.connectionState, 'offline');

  // No connect packet should have been written.
  assertEquals(client.sentPackets.length, 0);

  // The promise returned from connect should have rejected.
  assertEquals(connectRejected, true);

  // Calling disconnect in the offline state is a no-op and transitions directly
  // to the disconnected state.
  client.disconnect();

  assertEquals(client.connectionState, 'disconnected');

  // Sleep long enough for the disconnect packet to have been written.
  await client.sleep(1);

  // But no disconnect packet should have been written.
  assertEquals(client.sentPackets.length, 0);
});

Deno.test('waiting for connack times out', async () => {
  const client = new TestClient({ connectTimeout: 5 });

  client.connect().catch(() => {});

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  // Now we see the connect packet was written.
  assertEquals(client.sentPackets[0].type, 'connect');

  // And we are waiting for a connack packet.
  assertEquals(client.connectionState, 'waiting-for-connack');

  // This is when we should receive the connack packet.
  // Simulate time passing by manually triggering the connect timer.
  client.testTriggerTimer('connect');

  assertEquals(client.connectionState, 'offline');

  // Calling disconnect in the offline state is a no-op and transitions directly
  // to the disconnected state.
  client.disconnect();

  assertEquals(client.connectionState, 'disconnected');

  // Sleep long enough for the disconnect packet to have been written.
  await client.sleep(1);

  // But no disconnect packet should have been written.
  assertEquals(client.sentPackets.length, 1);
});

Deno.test('client can receive one byte at a time', async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[0].type, 'connect');
  assertEquals(client.connectionState, 'waiting-for-connack');

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
    utf8Encoder
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
  assertEquals(client.connectionState, 'waiting-for-connack');

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
      utf8Encoder
    ),
    ...encode(
      {
        type: 'publish',
        topic: 'topic2',
        payload: 'payload2',
      },
      utf8Encoder
    ),
  ]);

  client.testReceiveBytes(bytes);

  assertEquals(client.receivedPackets.length, 3);
  assertEquals(client.receivedPackets[1].type, 'publish');
  assertEquals((client.receivedPackets[1] as PublishPacket).topic, 'topic1');
  assertEquals(client.receivedPackets[2].type, 'publish');
  assertEquals((client.receivedPackets[2] as PublishPacket).topic, 'topic2');
});

Deno.test('connect resolves on the first successful connection', async () => {
  const client = new TestClient({ openRejects: 1 });

  let connectResolved = false;

  client.connect().then(() => {
    connectResolved = true;
  });

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow open to reject.
  await client.sleep(1);

  assertEquals(client.connectionState, 'offline');
  assertEquals(connectResolved, false);

  client.testTriggerTimer('reconnect');

  assertEquals(client.connectionState, 'connecting');
  assertEquals(connectResolved, false);

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.connectionState, 'waiting-for-connack');
  assertEquals(connectResolved, false);

  client.testReceivePacket({
    type: 'connack',
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, 'connected');
  assertEquals(connectResolved, false);

  // Sleep a little to allow the connect promise to resolve.
  await client.sleep(1);

  assertEquals(client.connectionState, 'connected');
  assertEquals(connectResolved, true);
});

Deno.test('connect rejects when retries is 0', async () => {
  const client = new TestClient({
    reconnect: {
      retries: 0,
    },
    openRejects: 1,
  });

  let connectResolved = false;
  let connectRejected = false;

  client
    .connect()
    .then(() => {
      connectResolved = true;
    })
    .catch(() => {
      connectRejected = true;
    });

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow open to reject.
  await client.sleep(1);

  assertEquals(client.connectionState, 'offline');
  assertEquals(connectResolved, false);
  assertEquals(connectRejected, true);
});

Deno.test('reconnecting resubscribes', async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[0].type, 'connect');
  assertEquals(client.connectionState, 'waiting-for-connack');

  client.testReceivePacket({
    type: 'connack',
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, 'connected');

  const suback1Promise = client.subscribe(['topic1', 'topic2']);

  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0 },
    { topic: 'topic2', qos: 0 },
  ]);

  // Sleep a little to allow the subscribe packet to be sent.
  await client.sleep(1);

  const subscribe1 = client.sentPackets[1] as SubscribePacket;

  assertEquals(subscribe1.type, 'subscribe');
  assertEquals(subscribe1.subscriptions, [
    { topic: 'topic1', qos: 0 },
    { topic: 'topic2', qos: 0 },
  ]);

  client.testReceivePacket({
    type: 'suback',
    id: subscribe1.id,
    returnCodes: [0, 0],
  });

  const suback1 = await suback1Promise;

  assertEquals(suback1.id, subscribe1.id);

  const unsubackPromise = client.unsubscribe('topic1');

  assertEquals(client.subscriptions, [{ topic: 'topic2', qos: 0 }]);

  // Sleep a little to allow the unsubscribe packet to be sent.
  await client.sleep(1);

  const unsubscribe = client.sentPackets[2] as UnsubscribePacket;

  assertEquals(unsubscribe.type, 'unsubscribe');
  assertEquals(unsubscribe.topics[0], 'topic1');

  client.testReceivePacket({
    type: 'unsuback',
    id: unsubscribe.id,
  });

  const unsuback = await unsubackPromise;

  assertEquals(unsuback.id, unsubscribe.id);

  // Subscribing to topic2 again (which we are still subscribe to)...
  const suback2Promise = client.subscribe('topic2');

  // ...should not add to the list of known subscriptions.
  assertEquals(client.subscriptions, [{ topic: 'topic2', qos: 0 }]);

  // Sleep a little to allow the subscribe packet to be sent.
  await client.sleep(1);

  const subscribe2 = client.sentPackets[3] as SubscribePacket;

  assertEquals(subscribe2.type, 'subscribe');
  assertEquals(subscribe2.subscriptions, [{ topic: 'topic2', qos: 0 }]);

  client.testReceivePacket({
    type: 'suback',
    id: subscribe2.id,
    returnCodes: [0],
  });

  const suback2 = await suback2Promise;

  assertEquals(suback2.id, subscribe2.id);

  // Break the connection so we can test resubscribing.
  client.testCloseConnection();

  assertEquals(client.connectionState, 'offline');

  client.testTriggerTimer('reconnect');

  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[4].type, 'connect');
  assertEquals(client.connectionState, 'waiting-for-connack');

  client.testReceivePacket({
    type: 'connack',
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, 'connected');

  // Sleep a little to allow the subscribe packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[5].type, 'subscribe');
  assertEquals((client.sentPackets[5] as SubscribePacket).subscriptions, [
    { topic: 'topic2', qos: 0 },
  ]);
});
