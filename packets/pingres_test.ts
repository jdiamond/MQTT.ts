import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { PingresPacket } from "./pingres.ts";
import { decode, encode } from "./pingres.ts";

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
  assertEquals<PingresPacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xd0, // packetType + flags
        0, // remainingLength
      ]),
      2,
      0,
    ),
    {
      type: "pingres",
    },
  );
});

Deno.test("decodeShortPingresPackets", function decodeShortPingresPackets() {
  // assertEquals(decode(Uint8Array.from([0xd0]), new TextDecoder()), null);
});
