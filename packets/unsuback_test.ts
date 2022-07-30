import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import { decode, encode } from "./mod.ts";

Deno.test("encodeUnsubackPacket", function encodeUnsubackPacket() {
  assertEquals(
    encode(
      {
        type: "unsuback",
        id: 1,
      },
      new TextEncoder(),
    ),
    [
      // fixedHeader
      0xb0, // packetType + flags
      2, // remainingLength
      // variableHeader
      0, // id MSB
      1, // id LSB
    ],
  );
});

Deno.test("decodeUnsubackPacket", function decodeUnsubackPacket() {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xb0, // packetType + flags
        2, // remainingLength
        // variableHeader
        0, // id MSB
        1, // id LSB
      ]),
      new TextDecoder(),
    ),
    {
      type: "unsuback",
      id: 1,
      length: 4,
    },
  );
});
