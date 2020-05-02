import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePubrelPacket', function encodePubrelPacket() {
  equal(
    encode({
      type: 'pubrel',
      id: 1337,
    }),
    [
      // fixedHeader
      0x62, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]
  );
});

Deno.test('decodePubrelPacket', function decodePubrelPacket() {
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x62, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ])
    ),
    {
      type: 'pubrel',
      id: 1337,
    }
  );
});

Deno.test('decodeShortPubrelPackets', function decodeShortPubrelPackets() {
  equal(decode(Uint8Array.from([0x62])), null);
  equal(decode(Uint8Array.from([0x62, 2])), null);
  equal(decode(Uint8Array.from([0x62, 2, 5])), null);
});
