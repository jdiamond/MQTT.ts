import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { PubrelPacket } from "./pubrel.ts";
import { decode, encode } from "./pubrel.ts";

Deno.test("encodePubrelPacket", function encodePubrelPacket() {
  assertEquals(
    encode({
      type: "pubrel",
      id: 1337,
    }),
    [
      // fixedHeader
      0x62, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]
  );
});

Deno.test("decodePubrelPacket", function decodePubrelPacket() {
  assertEquals<PubrelPacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x62, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ]),
      2,
      2
    ),
    {
      type: "pubrel",
      id: 1337,
    }
  );
});

Deno.test("decodeShortPubrelPackets", function decodeShortPubrelPackets() {
  // assertEquals(decode(Uint8Array.from([0x62]), new TextDecoder()), null);
  assertThrows(() => decode(Uint8Array.from([0x62, 2]), 2, 0));
  assertThrows(() => decode(Uint8Array.from([0x62, 2, 5]), 2, 1));
});
