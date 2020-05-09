export interface PingreqPacket {
  type: 'pingreq';
}

export default {
  encode(_packet: PingreqPacket) {
    const packetType = 0b1100;
    const flags = 0b0000;

    return [(packetType << 4) + flags, 0];
  },

  decode(
    _buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): PingreqPacket {
    return {
      type: 'pingreq',
    };
  },
};
