import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import { decode, encode } from "./mod.ts";

Deno.test("encodePingresPacket", function encodePingresPacket() {
  assertEquals(
    encode({
      type: "pingres",
    }),
    [
      // fixedHeader
      0xd0, // packetType + flags
      0, // remainingLength
    ],
  );
});

Deno.test("decodePingresPacket", function decodePingresPacket() {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xd0, // packetType + flags
        0, // remainingLength
      ]),
    ),
    {
      type: "pingres",
      length: 2,
    },
  );
});

Deno.test("decodeShortPingresPackets", function decodeShortPingresPackets() {
  assertEquals(decode(Uint8Array.from([0xd0])), null);
});
