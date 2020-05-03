import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodeDisconnectPacket', function encodeDisconnectPacket() {
  equal(
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
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        224, // packetType + flags
        0, // remainingLength
      ])
    ),
    {
      type: 'disconnect',
    }
  );
});
