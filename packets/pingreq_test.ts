import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePingreqPacket', function encodePingreqPacket() {
  equal(
    encode({
      type: 'pingreq',
    }),
    [
      // fixedHeader
      0xc0, // packetType + flags
      0, // remainingLength
    ]
  );
});

Deno.test('decodePingreqPacket', function decodePingreqPacket() {
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xc0, // packetType + flags
        0, // remainingLength
      ])
    ),
    {
      type: 'pingreq',
    }
  );
});

Deno.test('decodeShortPingrecPackets', function decodeShortPingrecPackets() {
  equal(decode(Uint8Array.from([0xc0])), null);
});
