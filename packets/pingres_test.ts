import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePingresPacket', function encodePingresPacket() {
  equal(
    encode({
      type: 'pingres',
    }),
    [
      // fixedHeader
      0xd0, // packetType + flags
      0, // remainingLength
    ]
  );
});

Deno.test('decodePingresPacket', function decodePingresPacket() {
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xd0, // packetType + flags
        0, // remainingLength
      ])
    ),
    {
      type: 'pingres',
    }
  );
});

Deno.test('decodeShortPingresPackets', function decodeShortPingresPackets() {
  equal(decode(Uint8Array.from([0xd0])), null);
});
