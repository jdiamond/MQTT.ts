export interface PingresPacket {
  type: 'pingres';
}

export default {
  encode(_packet: PingresPacket) {
    return [0xd0, 0];
  },

  decode(
    _buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): PingresPacket {
    return {
      type: 'pingres',
    };
  },
};
