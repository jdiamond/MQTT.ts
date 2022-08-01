export interface PingreqPacket {
  type: "pingreq";
}

export function encode(_packet: PingreqPacket) {
  const packetType = 0b1100;
  const flags = 0b0000;

  return Uint8Array.from([(packetType << 4) + flags, 0]);
}

export function decode(
  _buffer: Uint8Array,
  _remainingStart: number,
  _remainingLength: number
): PingreqPacket {
  return {
    type: "pingreq",
  };
}
