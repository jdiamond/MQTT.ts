import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodePublishPacket', function encodePublishPacket() {
  equal(
    encode({
      type: 'publish',
      topic: 'a/b',
      payload: 'payload',
    }),
    [
      // fixedHeader
      48, // packetType + flags
      12, // remainingLength
      // variableHeader
      0, // topicLength MSB
      3, // topicLength LSB
      97, // 'a'
      47, // '/'
      98, // 'b'
      // payload
      112, // 'p'
      97, // 'a'
      121, // 'y'
      108, // 'l'
      111, // 'o'
      97, // 'a'
      100, // 'd'
    ]
  );
});

Deno.test('decodePublishPacket', function decodePublishPacket() {
  equal(
    decode(
      Uint8Array.from([
        // fixedHeader
        48, // packetType + flags
        12, // remainingLength
        // variableHeader
        0, // topicLength MSB
        3, // topicLength LSB
        97, // 'a'
        47, // '/'
        98, // 'b'
        // payload
        112, // 'p'
        97, // 'a'
        121, // 'y'
        108, // 'l'
        111, // 'o'
        97, // 'a'
        100, // 'd'
      ])
    ),
    {
      type: 'publish',
      dup: false,
      qos: 0,
      retain: false,
      id: 0,
      topic: 'a/b',
      payload: Uint8Array.from([
        112, // 'p'
        97, // 'a'
        121, // 'y'
        108, // 'l'
        111, // 'o'
        97, // 'a'
        100, // 'd'
      ]),
    }
  );
});
