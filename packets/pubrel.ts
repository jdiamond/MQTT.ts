export interface PubrelPacket {
  type: "pubrel";
  id: number;
}

export function encode(packet: PubrelPacket) {
  const packetType = 6;
  const flags = 2;

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
): PubrelPacket {
  if (remainingLength !== 2) {
    throw new Error("pubrel packets must have a length of 2");
  }

  const id = (buffer[2] << 8) + buffer[3];

  return {
    type: "pubrel",
    id,
  };
}
