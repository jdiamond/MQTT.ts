export interface ConnackPacket {
  type: 'connack';
  sessionPresent: boolean;
  returnCode: number;
}

export default {
  encode(packet: ConnackPacket) {
    const packetType = 2;
    const flags = 0;

    return [
      (packetType << 4) + flags,
      2,
      packet.sessionPresent ? 1 : 0,
      packet.returnCode || 0,
    ];
  },

  decode(
    buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): ConnackPacket {
    const sessionPresent = !!(buffer[2] & 1);
    const returnCode = buffer[3];

    return {
      type: 'connack',
      sessionPresent,
      returnCode,
    };
  },
};
