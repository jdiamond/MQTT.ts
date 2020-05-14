import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodeConnackPacket', function encodeConnackPacket() {
  assertEquals(
    encode({
      type: 'connack',
      sessionPresent: false,
      returnCode: 0,
    }),
    [
      // fixedHeader
      32, // packetType + flags
      2, // remainingLength
      // variableHeader
      0, // connack flags
      0, // return code
    ]
  );
});

Deno.test('decodeConnackPacket', function decodeConnackPacket() {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        32, // packetType + flags
        2, // remainingLength
        // variableHeader
        0, // connack flags
        0, // return code
      ])
    ),
    {
      type: 'connack',
      sessionPresent: false,
      returnCode: 0,
      length: 4,
    }
  );
});

Deno.test(
  'decodeConnackPacketWithSessionPresent',
  function decodeConnackPacketWithSessionPresent() {
    assertEquals(
      decode(
        Uint8Array.from([
          // fixedHeader
          32, // packetType + flags
          2, // remainingLength
          // variableHeader
          1, // connack flags (sessionPresent)
          0, // return code
        ])
      ),
      {
        type: 'connack',
        sessionPresent: true,
        returnCode: 0,
        length: 4,
      }
    );
  }
);

Deno.test(
  'decodeConnackPacketWithReturnCode',
  function decodeConnackPacketWithReturnCode() {
    assertEquals(
      decode(
        Uint8Array.from([
          // fixedHeader
          32, // packetType + flags
          2, // remainingLength
          // variableHeader
          0, // connack flags
          4, // return code (bad username or password)
        ])
      ),
      {
        type: 'connack',
        sessionPresent: false,
        returnCode: 4,
        length: 4,
      }
    );
  }
);

Deno.test('decodeShortConnackPackets', function decodeShortConnackPackets() {
  assertEquals(decode(Uint8Array.from([32])), null);
  assertEquals(decode(Uint8Array.from([32, 2])), null);
  assertEquals(decode(Uint8Array.from([32, 2, 0])), null);
});
