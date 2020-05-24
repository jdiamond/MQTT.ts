import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { TestClient } from './test.ts';
import { SubscribePacket, UnsubscribePacket } from '../packets/mod.ts';

Deno.test('subscribe and unsubscribe called while connected', async () => {
  const client = new TestClient();

  client.connect();

  // Client immediately transitions to connecting state.
  assertEquals(client.connectionState, 'connecting');

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 1);
  assertEquals(client.sentPackets[0].type, 'connect');
  assertEquals(client.connectionState, 'waiting-for-connack');

  client.testReceivePacket({
    type: 'connack',
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, 'connected');

  const subscribe1Promise = client.subscribe('topic1');

  let subscribe1Resolved = false;

  subscribe1Promise.then(() => {
    subscribe1Resolved = true;
  });

  // Subscription is initially in the pending state.
  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'pending' },
  ]);

  // Sleep so the subscribe packet can be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 2);
  assertEquals(client.sentPackets[1].type, 'subscribe');

  const subscribePacket = client.sentPackets[1] as SubscribePacket;

  // The subscription state is now unacknowledged.
  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'unacknowledged' },
  ]);

  client.testReceivePacket({
    type: 'suback',
    id: subscribePacket.id,
    returnCodes: [0],
  });

  assertEquals(subscribe1Resolved, false);
  await client.sleep(1);
  assertEquals(subscribe1Resolved, true);

  const subscribe1Result = await subscribe1Promise;

  assertEquals(subscribe1Result, [
    { topic: 'topic1', qos: 0, state: 'acknowledged', returnCode: 0 },
  ]);

  // The subscription state is now acknowledged.
  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'acknowledged', returnCode: 0 },
  ]);

  const unsubscribe1Promise = client.unsubscribe('topic1');

  let unsubscribe1Resolved = false;

  unsubscribe1Promise.then(() => {
    unsubscribe1Resolved = true;
  });

  // The subscription state is now unsubscribe-pending.
  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'unsubscribe-pending', returnCode: 0 },
  ]);

  // Sleep so the unsubscribe packet can be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 3);
  assertEquals(client.sentPackets[2].type, 'unsubscribe');

  const unsubscribePacket = client.sentPackets[2] as UnsubscribePacket;

  // The subscription state is now unsubscribe-unacknowledged.
  assertEquals(client.subscriptions, [
    {
      topic: 'topic1',
      qos: 0,
      state: 'unsubscribe-unacknowledged',
      returnCode: 0,
    },
  ]);

  client.testReceivePacket({ type: 'unsuback', id: unsubscribePacket.id });

  // There are now no subscriptions.
  assertEquals(client.subscriptions, []);

  assertEquals(unsubscribe1Resolved, false);
  await client.sleep(1);
  assertEquals(unsubscribe1Resolved, true);

  const unsubscribe1Result = await unsubscribe1Promise;

  assertEquals(unsubscribe1Result, [
    {
      topic: 'topic1',
      qos: 0,
      state: 'unsubscribe-acknowledged',
      returnCode: 0,
    },
  ]);
});

Deno.test('subscribe called while connecting', async () => {
  const client = new TestClient();

  client.connect();

  // Client immediately transitions to connecting state.
  assertEquals(client.connectionState, 'connecting');

  // Can still subscribe.
  client.subscribe('topic1');

  // Client is still in connecting state.
  assertEquals(client.connectionState, 'connecting');

  // Subscribe packet cannot be sent until connected so subscription state is pending.
  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'pending' },
  ]);

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 1);
  assertEquals(client.sentPackets[0].type, 'connect');
  assertEquals(client.connectionState, 'waiting-for-connack');

  client.testReceivePacket({
    type: 'connack',
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, 'connected');

  // Sleep so the subscribe packet can be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 2);
  assertEquals(client.sentPackets[1].type, 'subscribe');

  // The subscription state is now unacknowledged.
  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'unacknowledged' },
  ]);
});

Deno.test('subscribe and unsubscribe called while connecting', async () => {
  const client = new TestClient();

  client.connect();

  // Client immediately transitions to connecting state.
  assertEquals(client.connectionState, 'connecting');

  // Can still subscribe.
  const suback1Promise = client.subscribe('topic1');

  // Client is still in connecting state.
  assertEquals(client.connectionState, 'connecting');

  // Subscribe packet cannot be sent until connected so subscription state is pending.
  assertEquals(client.subscriptions, [
    { topic: 'topic1', qos: 0, state: 'pending' },
  ]);

  // Can call unsubscribe while still connecting.
  client.unsubscribe('topic1');

  // Client is still in connecting state.
  assertEquals(client.connectionState, 'connecting');

  // Pending subscription is gone.
  assertEquals(client.subscriptions, []);

  // Original call to subscribe resolves.
  const suback1 = await suback1Promise;

  // Subscription state is removed because subscribe packet was never sent and acknowledged.
  assertEquals(suback1, [{ topic: 'topic1', qos: 0, state: 'removed' }]);
});

// publish or subscribe before connect?

// connect called
// online
// subscribe called
// subscribe sent
// suback received
// original subscribe call resolved
// offline
// reconnect
// online
// resubscribe
// subscribe sent
// suback received
// orignal subscribe call not resolved again

// connect called
// subscribe called while connecting
// online
// subscribe sent
// suback received
// original subscribe call resolved
// offline
// reconnect
// online
// subscribe sent
// suback received
// orignal subscribe call not resolved again

// connect called
// subscribe called while connecting
// unsubscribe called while connecting
// online
// subscribe sent
// suback received
// original subscribe call resolved
// unsubscribe sent
// unsuback received
// original unsubscribe call resolved
// offline
// reconnect
// online
// nothing to resubscribe

// connect called
// online
// subscribe called while online
// subscribe sent
// suback received
// original subscribe call resolved
// offline
// unsubscribe called while offline
// reconnect
// online
// ?

// if subscription is stored in session on server, do not resubscribe?
// check for clean and session present flags?

// if unsubscribe called before subscribe packet is sent, remove subscriptions from subscribe packet?
// if no subscriptions left, do not send subscribe packet?
// original subscribe call never resolves?

// subscription states?
// pending, sent, acknowledged?
// need state or boolean to indicate subscription stored in session on server?
