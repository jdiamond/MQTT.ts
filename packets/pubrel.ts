export interface PubrelPacket {
  type: 'pubrel';
  id: number;
}

export default {
  encode(packet: PubrelPacket) {
    const packetType = 6;
    const flags = 2;

    return [(packetType << 4) + flags, 2, packet.id >> 8, packet.id & 0xff];
  },

  decode(
    buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): PubrelPacket {
    const id = (buffer[2] << 8) + buffer[3];

    return {
      type: 'pubrel',
      id,
    };
  },
};
