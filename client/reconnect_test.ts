import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { TestClient } from './test.ts';
import { SubscribePacket, UnsubscribePacket } from '../packets/mod.ts';

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
    { topic: 'topic1', qos: 0, state: 'pending' },
    { topic: 'topic2', qos: 0, state: 'pending' },
  ]);

  // Sleep a little to allow the subscribe packet to be sent.
  await client.sleep(1);

  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'unacknowledged' },
    { topic: 'topic2', qos: 0, state: 'unacknowledged' },
  ]);

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

  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'acknowledged', returnCode: 0 },
    { topic: 'topic2', qos: 0, state: 'acknowledged', returnCode: 0 },
  ]);

  const suback1 = await suback1Promise;

  assertEquals(suback1, [
    { topic: 'topic1', qos: 0, state: 'acknowledged', returnCode: 0 },
    { topic: 'topic2', qos: 0, state: 'acknowledged', returnCode: 0 },
  ]);

  const unsubackPromise = client.unsubscribe('topic1');

  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'unsubscribe-pending', returnCode: 0 },
    { topic: 'topic2', qos: 0, state: 'acknowledged', returnCode: 0 },
  ]);

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

  assertEquals(unsuback, [
    {
      topic: 'topic1',
      qos: 0,
      state: 'unsubscribe-acknowledged',
      returnCode: 0,
    },
  ]);

  // Subscribing to topic2 again (which we are still subscribed to)...
  const suback2Promise = client.subscribe('topic2');

  // ...resets the state back to pending.
  assertEquals(client.subscriptions, [
    { topic: 'topic2', qos: 0, state: 'pending' },
  ]);

  // Sleep a little to allow the subscribe packet to be sent.
  await client.sleep(1);

  const subscribe2 = client.sentPackets[3] as SubscribePacket;

  assertEquals(subscribe2.type, 'subscribe');
  assertEquals(subscribe2.subscriptions, [{ topic: 'topic2', qos: 0 }]);

  // The subscription state is now unacknowledged.
  assertEquals(client.subscriptions, [
    { topic: 'topic2', qos: 0, state: 'unacknowledged' },
  ]);

  client.testReceivePacket({
    type: 'suback',
    id: subscribe2.id,
    returnCodes: [0],
  });

  const suback2 = await suback2Promise;

  assertEquals(suback2, [
    { topic: 'topic2', qos: 0, state: 'acknowledged', returnCode: 0 },
  ]);

  // The subscription state is now acknowledged.
  assertEquals(client.subscriptions, [
    { topic: 'topic2', qos: 0, state: 'acknowledged', returnCode: 0 },
  ]);

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
