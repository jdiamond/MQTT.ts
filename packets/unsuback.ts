export interface UnsubackPacket {
  type: "unsuback";
  id: number;
}

export default {
  encode(packet: UnsubackPacket) {
    const packetType = 11;
    const flags = 0;

    return Uint8Array.from([
      (packetType << 4) + flags,
      2,
      packet.id >> 8,
      packet.id & 0xff,
    ]);
  },

  decode(
    buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): UnsubackPacket {
    const id = (buffer[2] << 8) + buffer[3];

    return {
      type: "unsuback",
      id,
    };
  },
};
