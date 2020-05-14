import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePubackPacket', function encodePubackPacket() {
  assertEquals(
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
  assertEquals(
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
      length: 4,
    }
  );
});

Deno.test('decodeShortPubackPackets', function decodeShortPubackPackets() {
  assertEquals(decode(Uint8Array.from([0x40])), null);
  assertEquals(decode(Uint8Array.from([0x40, 2])), null);
  assertEquals(decode(Uint8Array.from([0x40, 2, 5])), null);
});
