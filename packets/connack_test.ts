import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { ConnackPacket } from "./connack.ts";
import { decode, encode } from "./connack.ts";

Deno.test("encodeConnackPacket", function encodeConnackPacket() {
  assertEquals(
    encode({
      type: "connack",
      sessionPresent: false,
      returnCode: 0,
    }),
    [
      // fixedHeader
      32, // packetType + flags
      2, // remainingLength
      // variableHeader
      0, // connack flags
      0, // return code
    ]
  );
});

Deno.test("decodeConnackPacket", function decodeConnackPacket() {
  assertEquals<ConnackPacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        32, // packetType + flags
        2, // remainingLength
        // variableHeader
        0, // connack flags
        0, // return code
      ]),
      2,
      2
    ),
    {
      type: "connack",
      sessionPresent: false,
      returnCode: 0,
    }
  );
});

Deno.test(
  "enodeConnackPacketWithSessionPresent",
  function decodeConnackPacketWithSessionPresent() {
    assertEquals(
      encode({
        type: "connack",
        sessionPresent: true,
        returnCode: 0,
      }),
      [
        // fixedHeader
        32, // packetType + flags
        2, // remainingLength
        // variableHeader
        1, // connack flags (sessionPresent)
        0, // return code
      ]
    );
  }
);

Deno.test(
  "decodeConnackPacketWithSessionPresent",
  function decodeConnackPacketWithSessionPresent() {
    assertEquals<ConnackPacket>(
      decode(
        Uint8Array.from([
          // fixedHeader
          32, // packetType + flags
          2, // remainingLength
          // variableHeader
          1, // connack flags (sessionPresent)
          0, // return code
        ]),
        2,
        2
      ),
      {
        type: "connack",
        sessionPresent: true,
        returnCode: 0,
      }
    );
  }
);

Deno.test(
  "decodeConnackPacketWithReturnCode",
  function decodeConnackPacketWithReturnCode() {
    assertEquals<ConnackPacket>(
      decode(
        Uint8Array.from([
          // fixedHeader
          32, // packetType + flags
          2, // remainingLength
          // variableHeader
          0, // connack flags
          4, // return code (bad username or password)
        ]),
        2,
        2
      ),
      {
        type: "connack",
        sessionPresent: false,
        returnCode: 4,
      }
    );
  }
);

Deno.test("decodeShortConnackPackets", function decodeShortConnackPackets() {
  // assertEquals(decode(Uint8Array.from([32]), new TextDecoder()), null);
  assertThrows<ConnackPacket>(() => decode(Uint8Array.from([32, 2]), 2, 0));
  assertThrows<ConnackPacket>(() => decode(Uint8Array.from([32, 2, 0]), 2, 1));
});
