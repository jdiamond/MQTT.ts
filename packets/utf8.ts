// Deno and browsers have global TextEncoder and TextDecoder classes, but
// Node.js does not so we have to use an abstraction for working with UTF8.
import { decodeBinaryValue, encodeBinaryValue } from "./binary.ts";

export interface UTF8Encoder {
  encode: (str?: string | undefined) => Uint8Array;
}

export interface UTF8Decoder {
  decode: (bytes: Uint8Array) => string;
}

export function encodeUTF8String(str: string, encoder: UTF8Encoder) {
  const bytes = encoder.encode(str);

  return encodeBinaryValue(bytes);
}

export function decodeUTF8String(
  buffer: Uint8Array,
  startIndex: number,
  utf8Decoder: UTF8Decoder,
) {
  const { length, value } = decodeBinaryValue(buffer, startIndex);
  const sValue = utf8Decoder.decode(value);

  return {
    length,
    value: sValue,
  };
}
