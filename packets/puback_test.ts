import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { PubackPacket } from "./puback.ts";
import { decode, encode } from "./puback.ts";

Deno.test("encodePubackPacket", function encodePubackPacket() {
  assertEquals(
    encode({
      type: "puback",
      id: 1337,
    }),
    [
      // fixedHeader
      0x40, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]
  );
});

Deno.test("decodePubackPacket", function decodePubackPacket() {
  assertEquals<PubackPacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x40, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ]),
      2,
      2
    ),
    {
      type: "puback",
      id: 1337,
    }
  );
});

Deno.test("decodeShortPubackPackets", function decodeShortPubackPackets() {
  // assertEquals(decode(Uint8Array.from([0x40]), new TextDecoder()), null);
  assertThrows(() => decode(Uint8Array.from([0x40, 2]), 2, 0));
  assertThrows(() => decode(Uint8Array.from([0x40, 2, 5]), 2, 1));
});
