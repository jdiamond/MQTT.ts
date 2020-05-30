import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { TestClient } from './test.ts';

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

Deno.test(
  'open throws, connect rejects when connect.retries is 0',
  async () => {
    const client = new TestClient({
      openRejects: 1,
      connect: { retries: 0 },
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
  }
);

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

Deno.test('connect rejects when connect.retries is 0', async () => {
  const client = new TestClient({
    connect: {
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

Deno.test(
  'connect does not resolve until the first successful connection',
  async () => {
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
  }
);
