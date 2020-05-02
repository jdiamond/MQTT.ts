import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePubcompPacket', function encodePubcompPacket() {
  equal(
    encode({
      type: 'pubcomp',
      id: 1337,
    }),
    [
      // fixedHeader
      0x70, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]
  );
});

Deno.test('decodePubcompPacket', function decodePubcompPacket() {
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x70, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ])
    ),
    {
      type: 'pubcomp',
      id: 1337,
    }
  );
});

Deno.test('decodeShortPubcompPackets', function decodeShortPubcompPackets() {
  equal(decode(Uint8Array.from([0x70])), null);
  equal(decode(Uint8Array.from([0x70, 2])), null);
  equal(decode(Uint8Array.from([0x70, 2, 5])), null);
});
