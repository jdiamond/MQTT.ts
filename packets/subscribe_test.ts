import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { encode } from './mod.ts';

Deno.test('encodeSubscribePacket', function encodeSubscribePacket() {
  assertEquals(
    encode(
      {
        type: 'subscribe',
        id: 1,
        subscriptions: [
          { topic: 'a/b', qos: 0 },
          { topic: 'c/d', qos: 1 },
        ],
      },
      new TextEncoder()
    ),
    [
      // fixedHeader
      0x82, // packetType + flags
      14, // remainingLength
      // variableHeader
      0, // id MSB
      1, // id LSB
      // payload
      0, // topic length MSB
      3, // topic length LSB
      97, // 'a'
      47, // '/'
      98, // 'b'
      0, // qos
      0, // topic length MSB
      3, // topic length LSB
      99, // 'c'
      47, // '/'
      100, // 'd'
      1, // qos
    ]
  );
});
