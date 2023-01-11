import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { PubcompPacket } from "./pubcomp.ts";
import { decode, encode } from "./pubcomp.ts";

Deno.test("encodePubcompPacket", function encodePubcompPacket() {
  assertEquals(
    encode({
      type: "pubcomp",
      id: 1337,
    }),
    [
      // fixedHeader
      0x70, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ],
  );
});

Deno.test("decodePubcompPacket", function decodePubcompPacket() {
  assertEquals<PubcompPacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x70, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ]),
      2,
      2,
    ),
    {
      type: "pubcomp",
      id: 1337,
    },
  );
});

Deno.test("decodeShortPubcompPackets", function decodeShortPubcompPackets() {
  // assertEquals(decode(Uint8Array.from([0x70]), new TextDecoder()), null);
  assertThrows(() => decode(Uint8Array.from([0x70, 2]), 2, 0));
  assertThrows(() => decode(Uint8Array.from([0x70, 2, 5]), 2, 1));
});
