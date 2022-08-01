export interface DisconnectPacket {
  type: "disconnect";
}

export default {
  encode(_packet: DisconnectPacket) {
    const packetType = 14;
    const flags = 0;

    return Uint8Array.from([(packetType << 4) | flags, 0]);
  },

  decode(
    _buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): DisconnectPacket {
    return {
      type: "disconnect",
    };
  },
};
