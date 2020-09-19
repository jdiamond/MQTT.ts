import { assertEquals } from 'https://deno.land/std@0.70.0/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodeSubackPacket', function decodeSubackPacket() {
  assertEquals(
    encode({
      type: 'suback',
      id: 1,
      returnCodes: [0, 1],
    }),
    [
      // fixedHeader
      0x90, // packetType + flags
      4, // remainingLength
      // variableHeader
      0, // id MSB
      1, // id LSB
      // payload
      0,
      1,
    ]
  );
});

Deno.test('decodeSubackPacket', function decodeSubackPacket() {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x90, // packetType + flags
        4, // remainingLength
        // variableHeader
        0, // id MSB
        1, // id LSB
        // payload
        0,
        1,
      ])
    ),
    {
      type: 'suback',
      id: 1,
      returnCodes: [0, 1],
      length: 6,
    }
  );
});
