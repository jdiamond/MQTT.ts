import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodeDisconnectPacket', function encodeDisconnectPacket() {
  assertEquals(
    encode({
      type: 'disconnect',
    }),
    [
      // fixedHeader
      224, // packetType + flags
      0, // remainingLength
    ]
  );
});

Deno.test('decodeDisconnectPacket', function decodeDisconnectPacket() {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        224, // packetType + flags
        0, // remainingLength
      ])
    ),
    {
      type: 'disconnect',
      length: 2,
    }
  );
});
