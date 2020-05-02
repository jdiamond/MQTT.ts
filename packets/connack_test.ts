import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encode, decode } from './mod.ts';

Deno.test('encodeConnackPacket', function encodeConnackPacket() {
  equal(
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
  equal(
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
    }
  );
});

Deno.test(
  'decodeConnackPacketWithSessionPresent',
  function decodeConnackPacketWithSessionPresent() {
    equal(
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
      }
    );
  }
);

Deno.test(
  'decodeConnackPacketWithReturnCode',
  function decodeConnackPacketWithReturnCode() {
    equal(
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
      }
    );
  }
);

Deno.test('decodeShortConnackPackets', function decodeShortConnackPackets() {
  equal(decode(Uint8Array.from([32])), null);
  equal(decode(Uint8Array.from([32, 2])), null);
  equal(decode(Uint8Array.from([32, 2, 0])), null);
});
