export interface PubackPacket {
  type: "puback";
  id: number;
}

export function encode(packet: PubackPacket) {
  const packetType = 4;
  const flags = 0;

  return Uint8Array.from([
    (packetType << 4) + flags,
    2,
    packet.id >> 8,
    packet.id & 0xff,
  ]);
}

export function decode(
  buffer: Uint8Array,
  _remainingStart: number,
  remainingLength: number
): PubackPacket {
  if (remainingLength !== 2) {
    throw new Error("puback packets must have a length of 2");
  }

  const id = (buffer[2] << 8) + buffer[3];

  return {
    type: "puback",
    id,
  };
}
