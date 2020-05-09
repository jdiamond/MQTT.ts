export interface PubackPacket {
  type: 'puback';
  id: number;
}

export default {
  encode(packet: PubackPacket) {
    const packetType = 4;
    const flags = 0;

    return [(packetType << 4) + flags, 2, packet.id >> 8, packet.id & 0xff];
  },

  decode(
    buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): PubackPacket {
    const id = (buffer[2] << 8) + buffer[3];

    return {
      type: 'puback',
      id,
    };
  },
};
