import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { UnsubackPacket } from "./unsuback.ts";
import { decode, encode } from "./unsuback.ts";

Deno.test("encodeUnsubackPacket", function encodeUnsubackPacket() {
  assertEquals(
    encode({
      type: "unsuback",
      id: 1,
    }),
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
  assertEquals<UnsubackPacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xb0, // packetType + flags
        2, // remainingLength
        // variableHeader
        0, // id MSB
        1, // id LSB
      ]),
      2,
      2,
    ),
    {
      type: "unsuback",
      id: 1,
    },
  );
});
