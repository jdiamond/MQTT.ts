import { assertEquals } from 'https://deno.land/std@0.50.0/testing/asserts.ts';
import { encodeLength as encode, decodeLength as decode } from './length.ts';

Deno.test('encodeLength', function encodeLength() {
  assertEquals(encode(0), [0x00]);
  assertEquals(encode(127), [0x7f]);
  assertEquals(encode(128), [0x80, 0x01]);
  assertEquals(encode(16_383), [0xff, 0x7f]);
  assertEquals(encode(16_384), [0x80, 0x80, 0x01]);
  assertEquals(encode(2_097_151), [0xff, 0xff, 0x7f]);
  assertEquals(encode(2_097_152), [0x80, 0x80, 0x80, 0x01]);
  assertEquals(encode(268_435_455), [0xff, 0xff, 0xff, 0x7f]);
});

Deno.test('decodeLength', function decodeLength() {
  assertEquals(decode(Uint8Array.from([0x00]), 0), {
    length: 0,
    bytesUsedToEncodeLength: 1,
  });
  assertEquals(decode(Uint8Array.from([0x7f]), 0), {
    length: 127,
    bytesUsedToEncodeLength: 1,
  });
  assertEquals(decode(Uint8Array.from([0x80, 0x01]), 0), {
    length: 128,
    bytesUsedToEncodeLength: 2,
  });
  assertEquals(decode(Uint8Array.from([0xff, 0x7f]), 0), {
    length: 16_383,
    bytesUsedToEncodeLength: 2,
  });
  assertEquals(decode(Uint8Array.from([0x80, 0x80, 0x01]), 0), {
    length: 16_384,
    bytesUsedToEncodeLength: 3,
  });
  assertEquals(decode(Uint8Array.from([0xff, 0xff, 0x7f]), 0), {
    length: 2_097_151,
    bytesUsedToEncodeLength: 3,
  });
  assertEquals(decode(Uint8Array.from([0x80, 0x80, 0x80, 0x01]), 0), {
    length: 2_097_152,
    bytesUsedToEncodeLength: 4,
  });
  assertEquals(decode(Uint8Array.from([0xff, 0xff, 0xff, 0x7f]), 0), {
    length: 268_435_455,
    bytesUsedToEncodeLength: 4,
  });
});
