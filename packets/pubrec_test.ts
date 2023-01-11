import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { PubrecPacket } from "./pubrec.ts";
import { decode, encode } from "./pubrec.ts";

Deno.test("encodePubrecPacket", function encodePubrecPacket() {
  assertEquals(
    encode({
      type: "pubrec",
      id: 1337,
    }),
    [
      // fixedHeader
      0x50, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ],
  );
});

Deno.test("decodePubrecPacket", function decodePubrecPacket() {
  assertEquals<PubrecPacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x50, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ]),
      2,
      2,
    ),
    {
      type: "pubrec",
      id: 1337,
    },
  );
});

Deno.test("decodeShortPubrecPackets", function decodeShortPubrecPackets() {
  // assertEquals(decode(Uint8Array.from([0x50]), new TextDecoder()), null);
  assertThrows(() => decode(Uint8Array.from([0x50, 2]), 2, 0));
  assertThrows(() => decode(Uint8Array.from([0x50, 2, 5]), 2, 1));
});
