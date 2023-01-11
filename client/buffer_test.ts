import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import { encode as encodeConnack } from "../packets/connack.ts";
import type { PublishPacket } from "../packets/publish.ts";
import { encode as encodePublish } from "../packets/publish.ts";
import { TestClient } from "./test_client.ts";

Deno.test("client can receive one byte at a time", async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, "connecting");

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[0].type, "connect");
  assertEquals(client.connectionState, "connecting");

  client.testReceiveBytes(
    encodeConnack({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    }),
    { trickle: true },
  );

  assertEquals(client.receivedPackets[0].type, "connack");
  assertEquals(client.connectionState, "connected");

  client.testReceiveBytes(
    encodePublish(
      {
        type: "publish",
        topic: "test",
        payload: "test",
        dup: false,
        retain: false,
        qos: 0,
        id: 0,
      },
      new TextEncoder(),
    ),
    { trickle: true },
  );

  assertEquals(client.receivedPackets[1].type, "publish");

  const bytes = encodePublish(
    {
      type: "publish",
      topic: "test2",
      payload: "test2",
      dup: false,
      retain: false,
      qos: 0,
      id: 0,
    },
    new TextEncoder(),
  );

  // Receive all but the last byte:
  client.testReceiveBytes(bytes.slice(0, bytes.length - 1));
  // No new packets have been received:
  assertEquals(client.receivedPackets.length, 2);
  // Send the last byte:
  client.testReceiveBytes(bytes.slice(bytes.length - 1));
  // A new packet has been received:
  assertEquals(client.receivedPackets.length, 3);
  assertEquals(client.receivedPackets[2].type, "publish");
});

Deno.test("client can receive bytes for multiple packets at once", async () => {
  const client = new TestClient();

  client.connect();

  assertEquals(client.connectionState, "connecting");

  // Sleep a little to allow the connect packet to be sent.
  await client.sleep(1);

  assertEquals(client.sentPackets[0].type, "connect");
  assertEquals(client.connectionState, "connecting");

  client.testReceiveBytes(
    encodeConnack({
      type: "connack",
      returnCode: 0,
      sessionPresent: false,
    }),
  );

  assertEquals(client.receivedPackets[0].type, "connack");
  assertEquals(client.connectionState, "connected");

  const bytes = Uint8Array.from([
    ...encodePublish(
      {
        type: "publish",
        topic: "topic1",
        payload: "payload1",
        dup: false,
        retain: false,
        qos: 0,
        id: 0,
      },
      new TextEncoder(),
    ),
    ...encodePublish(
      {
        type: "publish",
        topic: "topic2",
        payload: "payload2",
        dup: false,
        retain: false,
        qos: 0,
        id: 0,
      },
      new TextEncoder(),
    ),
  ]);

  client.testReceiveBytes(bytes);

  assertEquals(client.receivedPackets.length, 3);
  assertEquals(client.receivedPackets[1].type, "publish");
  assertEquals((client.receivedPackets[1] as PublishPacket).topic, "topic1");
  assertEquals(client.receivedPackets[2].type, "publish");
  assertEquals((client.receivedPackets[2] as PublishPacket).topic, "topic2");
});
