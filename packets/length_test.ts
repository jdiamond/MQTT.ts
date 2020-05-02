import { equal } from 'https://deno.land/std/testing/asserts.ts';
import { encodeLength as encode, decodeLength as decode } from './length.ts';

Deno.test('encodeLength', function encodeLength() {
  equal(encode(0), [0x00]);
  equal(encode(127), [0x7f]);
  equal(encode(128), [0x80, 0x01]);
  equal(encode(16_383), [0xff, 0x7f]);
  equal(encode(16_384), [0x80, 0x80, 0x01]);
  equal(encode(2_097_151), [0xff, 0xff, 0x7f]);
  equal(encode(2_097_152), [0x80, 0x80, 0x80, 0x01]);
  equal(encode(268_435_455), [0xff, 0xff, 0xff, 0x7f]);
});

Deno.test('decodeLength', function decodeLength() {
  equal(decode(Uint8Array.from([0x00]), 0), 0);
  equal(decode(Uint8Array.from([0x7f]), 0), 127);
  equal(decode(Uint8Array.from([0x80, 0x01]), 0), 128);
  equal(decode(Uint8Array.from([0xff, 0x7f]), 0), 16_383);
  equal(decode(Uint8Array.from([0x80, 0x80, 0x01]), 0), 16_384);
  equal(decode(Uint8Array.from([0xff, 0xff, 0x7f]), 0), 2_097_151);
  equal(decode(Uint8Array.from([0x80, 0x80, 0x80, 0x01]), 0), 2_097_152);
  equal(decode(Uint8Array.from([0xff, 0xff, 0xff, 0x7f]), 0), 268_435_455);
});
