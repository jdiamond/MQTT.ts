export interface ConnackPacket {
  type: "connack";
  sessionPresent: boolean;
  returnCode: number;
}

export function encode(packet: ConnackPacket) {
  const packetType = 2;
  const flags = 0;

  return Uint8Array.from([
    (packetType << 4) + flags,
    2,
    packet.sessionPresent ? 1 : 0,
    packet.returnCode || 0,
  ]);
}

export function decode(
  buffer: Uint8Array,
  _remainingStart: number,
  remainingLength: number
): ConnackPacket {
  if (remainingLength !== 2) {
    throw new Error("connack packets must have a length of 2");
  }

  const sessionPresent = !!(buffer[2] & 1);
  const returnCode = buffer[3];

  return {
    type: "connack",
    sessionPresent,
    returnCode,
  };
}
