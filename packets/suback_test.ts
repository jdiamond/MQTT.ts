import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { decode } from './mod.ts';

Deno.test('decodeSubackPacket', function decodeSubackPacket() {
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x90, // packetType + flags
        3, // remainingLength
        // variableHeader
        0, // id MSB
        1, // id LSB
        // payload
        0,
      ])
    ),
    {
      type: 'suback',
      id: 1,
      returnCodes: [0],
    }
  );
});
