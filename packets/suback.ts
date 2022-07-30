export interface SubackPacket {
  type: "suback";
  id: number;
  returnCodes: number[];
}

export default {
  encode(packet: SubackPacket) {
    const packetType = 9;
    const flags = 0;

    return [
      (packetType << 4) + flags,
      2 + packet.returnCodes.length,
      packet.id >> 8,
      packet.id & 0xff,
      ...packet.returnCodes,
    ];
  },

  decode(
    buffer: Uint8Array,
    remainingStart: number,
    _remainingLength: number,
  ): SubackPacket {
    const idStart = remainingStart;
    const id = (buffer[idStart] << 8) + buffer[idStart + 1];
    const payloadStart = idStart + 2;
    const returnCodes = [];

    for (let i = payloadStart; i < buffer.length; i++) {
      returnCodes.push(buffer[i]);
    }

    return {
      type: "suback",
      id,
      returnCodes,
    };
  },
};
