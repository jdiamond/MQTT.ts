export interface PingresPacket {
  type: "pingres";
}

export function encode(_packet: PingresPacket) {
  return Uint8Array.from([0xd0, 0]);
}

export function decode(
  _buffer: Uint8Array,
  _remainingStart: number,
  _remainingLength: number,
): PingresPacket {
  return {
    type: "pingres",
  };
}
