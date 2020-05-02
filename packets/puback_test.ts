import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePubackPacket', function encodePubackPacket() {
  equal(
    encode({
      type: 'puback',
      id: 1337,
    }),
    [
      // fixedHeader
      0x40, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]
  );
});

Deno.test('decodePubackPacket', function decodePubackPacket() {
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x40, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ])
    ),
    {
      type: 'puback',
      id: 1337,
    }
  );
});

Deno.test('decodeShortPubackPackets', function decodeShortPubackPackets() {
  equal(decode(Uint8Array.from([0x40])), null);
  equal(decode(Uint8Array.from([0x40, 2])), null);
  equal(decode(Uint8Array.from([0x40, 2, 5])), null);
});
