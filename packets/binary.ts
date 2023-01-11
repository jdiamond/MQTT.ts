// Deno and browsers have global TextEncoder and TextDecoder classes, but
// Node.js does not so we have to use an abstraction for working with UTF8.

export function encodeBinaryValue(bytes: Uint8Array) {
  return [bytes.length >> 8, bytes.length & 0xff, ...bytes];
}

export function decodeBinaryValue(
  buffer: Uint8Array,
  startIndex: number,
) {
  const length = (buffer[startIndex] << 8) + buffer[startIndex + 1];
  const bytes = buffer.slice(startIndex + 2, startIndex + 2 + length);

  return {
    length: length + 2,
    value: bytes,
  };
}
