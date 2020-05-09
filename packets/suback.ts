export interface SubackPacket {
  type: 'suback';
  id: number;
  returnCodes: number[];
}

export default {
  encode(_packet: SubackPacket) {
    throw new Error('suback.encode is not implemented yet');
  },

  decode(
    buffer: Uint8Array,
    remainingStart: number,
    _remainingLength: number
  ): SubackPacket {
    const idStart = remainingStart;
    const id = (buffer[idStart] << 8) + buffer[idStart + 1];
    const payloadStart = idStart + 2;
    const returnCodes = [];

    for (let i = payloadStart; i < buffer.length; i++) {
      returnCodes.push(buffer[i]);
    }

    return {
      type: 'suback',
      id,
      returnCodes,
    };
  },
};
