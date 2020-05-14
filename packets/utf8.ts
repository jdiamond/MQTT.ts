// Deno and browsers have global TextEncoder and TextDecoder classes, but
// Node.js does not so we have to use an abstraction for working with UTF8.

export interface UTF8Encoder {
  encode: (str: string) => Uint8Array;
}

export interface UTF8Decoder {
  decode: (bytes: Uint8Array) => string;
}

export function encodeUTF8String(str: string, encoder: UTF8Encoder) {
  const bytes = encoder.encode(str);

  return [bytes.length >> 8, bytes.length & 0xff, ...bytes];
}

export function decodeUTF8String(
  buffer: Uint8Array,
  startIndex: number,
  utf8Decoder: UTF8Decoder
) {
  const length = (buffer[startIndex] << 8) + buffer[startIndex + 1];
  const bytes = buffer.slice(startIndex + 2, startIndex + 2 + length);
  const value = utf8Decoder.decode(bytes);

  return {
    length: length + 2,
    value,
  };
}
