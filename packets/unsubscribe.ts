import { encodeLength } from './length.ts';
import { UTF8Encoder, encodeUTF8String } from './utf8.ts';

export interface UnsubscribePacket {
  type: 'unsubscribe';
  id: number;
  topics: string[];
}

export default {
  encode(packet: UnsubscribePacket, utf8Encoder: UTF8Encoder) {
    const packetType = 0b1010;
    const flags = 0b0010;

    const variableHeader = [packet.id >> 8, packet.id & 0xff];

    const payload = [];

    for (const topic of packet.topics) {
      payload.push(...encodeUTF8String(topic, utf8Encoder));
    }

    const fixedHeader = [
      (packetType << 4) | flags,
      ...encodeLength(variableHeader.length + payload.length),
    ];

    return [...fixedHeader, ...variableHeader, ...payload];
  },

  decode(
    _buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number
  ): UnsubscribePacket {
    throw new Error('unsubscribe.decode is not implemented yet');
  },
};
