import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import { decode, encode } from "./mod.ts";

Deno.test("encodePubrecPacket", function encodePubrecPacket() {
  assertEquals(
    encode(
      {
        type: "pubrec",
        id: 1337,
      },
      new TextEncoder(),
    ),
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
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x50, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ]),
      new TextDecoder(),
    ),
    {
      type: "pubrec",
      id: 1337,
      length: 4,
    },
  );
});

Deno.test("decodeShortPubrecPackets", function decodeShortPubrecPackets() {
  assertEquals(decode(Uint8Array.from([0x50]), new TextDecoder()), null);
  assertEquals(decode(Uint8Array.from([0x50, 2]), new TextDecoder()), null);
  assertEquals(decode(Uint8Array.from([0x50, 2, 5]), new TextDecoder()), null);
});
