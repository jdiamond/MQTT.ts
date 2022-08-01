import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { PingreqPacket } from "./pingreq.ts";
import { decode, encode } from "./pingreq.ts";

Deno.test("encodePingreqPacket", function encodePingreqPacket() {
  assertEquals(
    encode({
      type: "pingreq",
    }),
    [
      // fixedHeader
      0xc0, // packetType + flags
      0, // remainingLength
    ]
  );
});

Deno.test("decodePingreqPacket", function decodePingreqPacket() {
  assertEquals<PingreqPacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xc0, // packetType + flags
        0, // remainingLength
      ]),
      2,
      0
    ),
    {
      type: "pingreq",
    }
  );
});

Deno.test("decodeShortPingrecPackets", function decodeShortPingrecPackets() {
  // assertEquals(decode(Uint8Array.from([0xc0]), new TextDecoder()), null);
});
