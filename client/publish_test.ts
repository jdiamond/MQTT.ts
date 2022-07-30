import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import {
  PubcompPacket,
  PublishPacket,
  PubrecPacket,
  PubrelPacket,
} from "../packets/mod.ts";
import { TestClient } from "./test_client.ts";

Deno.test("publish qos 0 while connected", async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, "connecting");

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 1);
  assertEquals(client.sentPackets[0].type, "connect");

  client.testReceivePacket({
    type: "connack",
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, "connected");

  const publish1Promise = client.publish("topic1", "payload1");

  let publish1Resolved = false;

  publish1Promise.then(() => {
    publish1Resolved = true;
  });

  assertEquals(publish1Resolved, false);

  // Sleep a little to allow the publish packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 2);
  assertEquals(client.sentPackets[1].type, "publish");

  assertEquals(publish1Resolved, true);
});

Deno.test("publish qos 0 while connecting", async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, "connecting");

  const publish1Promise = client.publish("topic1", "payload1");

  let publish1Resolved = false;

  publish1Promise.then(() => {
    publish1Resolved = true;
  });

  assertEquals(publish1Resolved, false);

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(publish1Resolved, false);

  assertEquals(client.sentPackets.length, 1);
  assertEquals(client.sentPackets[0].type, "connect");

  client.testReceivePacket({
    type: "connack",
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, "connected");

  assertEquals(publish1Resolved, false);

  // Sleep a little to allow the publish packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 2);
  assertEquals(client.sentPackets[1].type, "publish");

  assertEquals(publish1Resolved, true);
});

Deno.test("publish qos 1 while connected", async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, "connecting");

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 1);
  assertEquals(client.sentPackets[0].type, "connect");

  client.testReceivePacket({
    type: "connack",
    returnCode: 0,
    sessionPresent: false,
  });

  assertEquals(client.connectionState, "connected");

  // Wish this wasn't required. I think it's necessary for all the flushing to finish.
  await client.sleep(1);

  const publish1Promise = client.publish("topic1", "payload1", { qos: 1 });

  let publish1Resolved = false;

  publish1Promise.then(() => {
    publish1Resolved = true;
  });

  assertEquals(publish1Resolved, false);

  // Sleep a little to allow the publish packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets.length, 2);
  assertEquals(client.sentPackets[1].type, "publish");

  const publish1Packet = client.sentPackets[1] as PublishPacket;

  assertEquals(publish1Resolved, false);

  client.testReceivePacket({ type: "puback", id: publish1Packet.id! });

  await client.sleep(1);

  assertEquals(publish1Resolved, true);
});

Deno.test(
  "publish qos 1, offline before puback, reconnect, resend",
  async () => {
    const client = new TestClient();

    client.connect();

    assertEquals(client.connectionState, "connecting");

    // Sleep a little to allow the connect packet to be sent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 1);
    assertEquals(client.sentPackets[0].type, "connect");

    client.testReceivePacket({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    });

    assertEquals(client.connectionState, "connected");

    // Wish this wasn't required. I think it's necessary for all the flushing to finish.
    await client.sleep(1);

    const publish1Promise = client.publish("topic1", "payload1", { qos: 1 });

    let publish1Resolved = false;

    publish1Promise.then(() => {
      publish1Resolved = true;
    });

    assertEquals(publish1Resolved, false);

    // Sleep a little to allow the publish packet to be sent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 2);
    assertEquals(client.sentPackets[1].type, "publish");

    const publish1Packet1 = client.sentPackets[1] as PublishPacket;

    assertEquals(publish1Packet1.dup, false);

    assertEquals(publish1Resolved, false);

    client.testCloseConnection();

    client.testTriggerTimer("reconnect");

    assertEquals(client.connectionState, "connecting");

    // Sleep a little to allow the connect packet to be sent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 3);
    assertEquals(client.sentPackets[2].type, "connect");

    client.testReceivePacket({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    });

    assertEquals(client.connectionState, "connected");

    // Sleep a little to allow the publish packet to be resent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 4);
    assertEquals(client.sentPackets[3].type, "publish");

    const publish1Packet2 = client.sentPackets[3] as PublishPacket;

    // Uses the same packet id as before.
    assertEquals(publish1Packet1.id, publish1Packet2.id);
    // But this time dup is set.
    assertEquals(publish1Packet2.dup, true);

    client.testReceivePacket({ type: "puback", id: publish1Packet1.id! });

    await client.sleep(1);

    assertEquals(publish1Resolved, true);

    client.testCloseConnection();

    client.testTriggerTimer("reconnect");

    assertEquals(client.connectionState, "connecting");

    // Sleep a little to allow the connect packet to be sent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 5);
    assertEquals(client.sentPackets[4].type, "connect");

    client.testReceivePacket({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    });

    assertEquals(client.connectionState, "connected");

    // Sleep a little to allow unacknowledged publish packets to get resent...
    await client.sleep(1);

    // ...but no new packets get sent.
    assertEquals(client.sentPackets.length, 5);
  },
);

Deno.test(
  "publish qos 2, offline before pubrec, reconnect, resend, offline before pubcomp, reconnect, resend",
  async () => {
    const client = new TestClient();

    client.connect();

    assertEquals(client.connectionState, "connecting");

    // Sleep a little to allow the connect packet to be sent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 1);
    assertEquals(client.sentPackets[0].type, "connect");

    client.testReceivePacket({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    });

    assertEquals(client.connectionState, "connected");

    // Wish this wasn't required. I think it's necessary for all the flushing to finish.
    await client.sleep(1);

    const publish1Promise = client.publish("topic1", "payload1", { qos: 2 });

    let publish1Resolved = false;

    publish1Promise.then(() => {
      publish1Resolved = true;
    });

    assertEquals(publish1Resolved, false);

    // Sleep a little to allow the publish packet to be sent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 2);
    assertEquals(client.sentPackets[1].type, "publish");

    const publish1Packet1 = client.sentPackets[1] as PublishPacket;

    assertEquals(publish1Packet1.dup, false);

    assertEquals(publish1Resolved, false);

    client.testCloseConnection();

    client.testTriggerTimer("reconnect");

    assertEquals(client.connectionState, "connecting");

    // Sleep a little to allow the connect packet to be sent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 3);
    assertEquals(client.sentPackets[2].type, "connect");

    client.testReceivePacket({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    });

    assertEquals(client.connectionState, "connected");

    // Sleep a little to allow the publish packet to be resent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 4);
    assertEquals(client.sentPackets[3].type, "publish");

    const publish1Packet2 = client.sentPackets[3] as PublishPacket;

    // Uses the same packet id as before.
    assertEquals(publish1Packet1.id, publish1Packet2.id);
    // But this time dup is set.
    assertEquals(publish1Packet2.dup, true);

    client.testReceivePacket({ type: "pubrec", id: publish1Packet1.id! });

    await client.sleep(1);

    assertEquals(client.sentPackets.length, 5);
    assertEquals(client.sentPackets[4].type, "pubrel");

    const pubrel1Packet1 = client.sentPackets[4] as PubrelPacket;

    assertEquals(publish1Resolved, false);

    client.testCloseConnection();

    client.testTriggerTimer("reconnect");

    assertEquals(client.connectionState, "connecting");

    // Sleep a little to allow the connect packet to be sent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 6);
    assertEquals(client.sentPackets[5].type, "connect");

    client.testReceivePacket({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    });

    assertEquals(client.connectionState, "connected");

    // Sleep a little to allow unacknowledged pubrel packets to get resent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 7);
    assertEquals(client.sentPackets[6].type, "pubrel");

    assertEquals(publish1Resolved, false);

    client.testReceivePacket({ type: "pubcomp", id: pubrel1Packet1.id });

    await client.sleep(1);

    assertEquals(publish1Resolved, true);

    client.testCloseConnection();

    client.testTriggerTimer("reconnect");

    assertEquals(client.connectionState, "connecting");

    // Sleep a little to allow the connect packet to be sent.
    await client.sleep(1);

    assertEquals(client.sentPackets.length, 8);
    assertEquals(client.sentPackets[7].type, "connect");

    client.testReceivePacket({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    });

    assertEquals(client.connectionState, "connected");

    // Sleep a little to allow unacknowledged publish/pubrel packets to get resent...
    await client.sleep(1);

    // ...but no new packets get sent.
    assertEquals(client.sentPackets.length, 8);
  },
);

Deno.test(
  "receiving multiple qos 2 publishes does not emit message more than once",
  async () => {
    const client = new TestClient();

    const emittedMessages = [];

    client.on("message", (topic: string, payload: Uint8Array) => {
      emittedMessages.push({ topic, payload });
    });

    client.connect();

    assertEquals(client.connectionState, "connecting");

    // Sleep a little to allow the connect packet to be sent.
    await client.sleep(1);

    client.testReceivePacket({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    });

    assertEquals(client.connectionState, "connected");

    client.testReceivePacket({
      type: "publish",
      topic: "topic1",
      payload: "payload1",
      qos: 2,
      id: 12,
      dup: false,
    });

    await client.sleep(1);

    assertEquals(emittedMessages.length, 1);

    await client.sleep(1);

    assertEquals(client.sentPackets.length, 2);
    assertEquals(client.sentPackets[1].type, "pubrec");
    assertEquals((client.sentPackets[1] as PubrecPacket).id, 12);

    client.testCloseConnection();

    client.testTriggerTimer("reconnect");

    assertEquals(client.connectionState, "connecting");

    // Sleep a little to allow the connect packet to be sent.
    await client.sleep(1);

    client.testReceivePacket({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    });

    assertEquals(client.connectionState, "connected");

    client.testReceivePacket({
      type: "publish",
      topic: "topic1",
      payload: "payload1",
      qos: 2,
      id: 12,
      dup: true,
    });

    assertEquals(emittedMessages.length, 1);

    await client.sleep(1);

    assertEquals(client.sentPackets.length, 4);
    assertEquals(client.sentPackets[3].type, "pubrec");
    assertEquals((client.sentPackets[3] as PubrecPacket).id, 12);

    client.testReceivePacket({
      type: "pubrel",
      id: 12,
    });

    await client.sleep(1);

    assertEquals(client.sentPackets.length, 5);
    assertEquals(client.sentPackets[4].type, "pubcomp");
    assertEquals((client.sentPackets[4] as PubcompPacket).id, 12);

    client.testReceivePacket({
      type: "publish",
      topic: "topic2",
      payload: "payload2",
      qos: 2,
      id: 13,
      dup: true,
    });

    await client.sleep(1);

    assertEquals(emittedMessages.length, 2);
  },
);
