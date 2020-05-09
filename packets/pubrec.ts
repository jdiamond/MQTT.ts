export interface PubrecPacket {
  type: 'pubrec';
  id: number;
}

export default {
  encode(packet: PubrecPacket) {
    const packetType = 5;
    const flags = 0;

    return [(packetType << 4) + flags, 2, packet.id >> 8, packet.id & 0xff];
  },

  decode(
    buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): PubrecPacket {
    const id = (buffer[2] << 8) + buffer[3];

    return {
      type: 'pubrec',
      id,
    };
  },
};
