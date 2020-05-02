export function encodeLength(x: number) {
  const output = [];

  do {
    let encodedByte = x % 128;

    x = Math.floor(x / 128);

    if (x > 0) {
      encodedByte = encodedByte | 128;
    }

    output.push(encodedByte);
  } while (x > 0);

  return output;
}

export function decodeLength(buffer: Uint8Array, startIndex: number) {
  let i = startIndex;
  let encodedByte = 0;
  let value = 0;
  let multiplier = 1;

  do {
    encodedByte = buffer[i++];

    value += (encodedByte & 127) * multiplier;

    if (multiplier > 128 * 128 * 128) {
      throw Error('malformed length');
    }

    multiplier *= 128;
  } while ((encodedByte & 128) != 0);

  return { length: value, bytesUsedToEncodeLength: i - startIndex };
}
