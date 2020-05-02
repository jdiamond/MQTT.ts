import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePubrecPacket', function encodePubrecPacket() {
  equal(
    encode({
      type: 'pubrec',
      id: 1337,
    }),
    [
      // fixedHeader
      0x50, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]
  );
});

Deno.test('decodePubrecPacket', function decodePubrecPacket() {
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x50, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ])
    ),
    {
      type: 'pubrec',
      id: 1337,
    }
  );
});

Deno.test('decodeShortPubrecPackets', function decodeShortPubrecPackets() {
  equal(decode(Uint8Array.from([0x50])), null);
  equal(decode(Uint8Array.from([0x50, 2])), null);
  equal(decode(Uint8Array.from([0x50, 2, 5])), null);
});
