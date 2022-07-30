import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import { decode, encode } from "./mod.ts";

Deno.test("encodeDisconnectPacket", function encodeDisconnectPacket() {
  assertEquals(
    encode(
      {
        type: "disconnect",
      },
      new TextEncoder(),
    ),
    [
      // fixedHeader
      224, // packetType + flags
      0, // remainingLength
    ],
  );
});

Deno.test("decodeDisconnectPacket", function decodeDisconnectPacket() {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        224, // packetType + flags
        0, // remainingLength
      ]),
      new TextDecoder(),
    ),
    {
      type: "disconnect",
      length: 2,
    },
  );
});
