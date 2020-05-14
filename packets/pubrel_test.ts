import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePubrelPacket', function encodePubrelPacket() {
  assertEquals(
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
  assertEquals(
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
      length: 4,
    }
  );
});

Deno.test('decodeShortPubrelPackets', function decodeShortPubrelPackets() {
  assertEquals(decode(Uint8Array.from([0x62])), null);
  assertEquals(decode(Uint8Array.from([0x62, 2])), null);
  assertEquals(decode(Uint8Array.from([0x62, 2, 5])), null);
});
