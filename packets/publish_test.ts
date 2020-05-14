import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { encode, decode } from './mod.ts';

const utf8Decoder = new TextDecoder();

Deno.test('encodePublishPacket', function encodePublishPacket() {
  assertEquals(
    encode(
      {
        type: 'publish',
        topic: 'a/b',
        payload: 'payload',
      },
      new TextEncoder()
    ),
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
  assertEquals(
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
      ]),
      utf8Decoder
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
      length: 14,
    }
  );
});

Deno.test(
  'decodePublishPacketWithExtraBytes',
  function decodePublishPacketWithExtraBytes() {
    assertEquals(
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
          101, // 'e'
          116, // 't'
          99, // 'c'
        ]),
        utf8Decoder
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
        length: 14,
      }
    );
  }
);
