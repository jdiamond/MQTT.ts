import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import { decode, encode } from "./mod.ts";

Deno.test("encodePingreqPacket", function encodePingreqPacket() {
  assertEquals(
    encode(
      {
        type: "pingreq",
      },
      new TextEncoder(),
    ),
    [
      // fixedHeader
      0xc0, // packetType + flags
      0, // remainingLength
    ],
  );
});

Deno.test("decodePingreqPacket", function decodePingreqPacket() {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xc0, // packetType + flags
        0, // remainingLength
      ]),
      new TextDecoder(),
    ),
    {
      type: "pingreq",
      length: 2,
    },
  );
});

Deno.test("decodeShortPingrecPackets", function decodeShortPingrecPackets() {
  assertEquals(decode(Uint8Array.from([0xc0]), new TextDecoder()), null);
});
