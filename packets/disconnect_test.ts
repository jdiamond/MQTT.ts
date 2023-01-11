import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { DisconnectPacket } from "./disconnect.ts";
import { decode, encode } from "./disconnect.ts";

Deno.test("encodeDisconnectPacket", function encodeDisconnectPacket() {
  assertEquals(
    encode({
      type: "disconnect",
    }),
    [
      // fixedHeader
      224, // packetType + flags
      0, // remainingLength
    ],
  );
});

Deno.test("decodeDisconnectPacket", function decodeDisconnectPacket() {
  assertEquals<DisconnectPacket>(
    decode(
      Uint8Array.from([
        // fixedHeader
        224, // packetType + flags
        0, // remainingLength
      ]),
      2,
      0,
    ),
    {
      type: "disconnect",
    },
  );
});
