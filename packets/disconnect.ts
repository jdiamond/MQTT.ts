export interface DisconnectPacket {
  type: 'disconnect';
}

export default {
  encode(_packet: DisconnectPacket) {
    const packetType = 14;
    const flags = 0;

    return [(packetType << 4) | flags, 0];
  },

  decode(_buffer: Uint8Array, _remainingLength: number): DisconnectPacket {
    throw new Error('disconnect.decode is not implemented yet');
  },
};
