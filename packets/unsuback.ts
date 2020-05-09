export interface UnsubackPacket {
  type: 'unsuback';
  id: number;
}

export default {
  encode(_packet: UnsubackPacket) {
    throw new Error('unsuback.encode is not implemented yet');
  },

  decode(
    buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): UnsubackPacket {
    const id = (buffer[2] << 8) + buffer[3];

    return {
      type: 'unsuback',
      id,
    };
  },
};
