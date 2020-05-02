import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode } from './mod.ts';

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
