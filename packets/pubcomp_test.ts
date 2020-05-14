import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePubcompPacket', function encodePubcompPacket() {
  assertEquals(
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
  assertEquals(
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
      length: 4,
    }
  );
});

Deno.test('decodeShortPubcompPackets', function decodeShortPubcompPackets() {
  assertEquals(decode(Uint8Array.from([0x70])), null);
  assertEquals(decode(Uint8Array.from([0x70, 2])), null);
  assertEquals(decode(Uint8Array.from([0x70, 2, 5])), null);
});
