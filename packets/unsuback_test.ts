import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { decode } from './mod.ts';

Deno.test('decodeUnsubackPacket', function decodeUnsubackPacket() {
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xb0, // packetType + flags
        2, // remainingLength
        // variableHeader
        0, // id MSB
        1, // id LSB
      ])
    ),
    {
      type: 'unsuback',
      id: 1,
    }
  );
});
