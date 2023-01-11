import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { UnsubscribePacket } from "./unsubscribe.ts";
import { decode, encode } from "./unsubscribe.ts";

Deno.test("encodeUnsubscribePacket", function encodeUnsubscribePacket() {
  assertEquals(
    encode(
      {
        type: "unsubscribe",
        id: 1,
        topicFilters: ["a/b", "c/d"],
      },
      new TextEncoder(),
    ),
    [
      // fixedHeader
      0xa2, // packetType + flags
      12, // remainingLength
      // variableHeader
      0, // id MSB
      1, // id LSB
      // payload
      0, // topic filter length MSB
      3, // topic filter length LSB
      97, // 'a'
      47, // '/'
      98, // 'b'
      0, // topic filter length MSB
      3, // topic filter length LSB
      99, // 'c'
      47, // '/'
      100, // 'd'
    ],
  );
});

Deno.test("decodeUnsubscribePacket", function decodeUnsubscribePacket() {
  assertEquals<UnsubscribePacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xa2, // packetType + flags
        12, // remainingLength
        // variableHeader
        0, // id MSB
        1, // id LSB
        // payload
        0, // topic filter length MSB
        3, // topic filter length LSB
        97, // 'a'
        47, // '/'
        98, // 'b'
        0, // topic filter length MSB
        3, // topic filter length LSB
        99, // 'c'
        47, // '/'
        100, // 'd'
      ]),
      2,
      12,
      new TextDecoder(),
    ),
    {
      type: "unsubscribe",
      id: 1,
      topicFilters: ["a/b", "c/d"],
    },
  );
});
