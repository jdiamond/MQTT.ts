import { encodeLength } from './length.ts';
import {
  UTF8Encoder,
  UTF8Decoder,
  encodeUTF8String,
  decodeUTF8String,
} from './utf8.ts';

export interface UnsubscribePacket {
  type: 'unsubscribe';
  id: number;
  topicFilters: string[];
}

export default {
  encode(packet: UnsubscribePacket, utf8Encoder: UTF8Encoder) {
    const packetType = 0b1010;
    const flags = 0b0010;

    const variableHeader = [packet.id >> 8, packet.id & 0xff];

    const payload = [];

    for (const topic of packet.topicFilters) {
      payload.push(...encodeUTF8String(topic, utf8Encoder));
    }

    const fixedHeader = [
      (packetType << 4) | flags,
      ...encodeLength(variableHeader.length + payload.length),
    ];

    return [...fixedHeader, ...variableHeader, ...payload];
  },

  decode(
    buffer: Uint8Array,
    remainingStart: number,
    _remainingLength: number,
    utf8Decoder: UTF8Decoder
  ): UnsubscribePacket {
    const idStart = remainingStart;
    const id = (buffer[idStart] << 8) + buffer[idStart + 1];

    const topicFiltersStart = idStart + 2;
    const topicFilters: string[] = [];

    for (let i = topicFiltersStart; i < buffer.length; ) {
      const topicFilter = decodeUTF8String(buffer, i, utf8Decoder);
      i += topicFilter.length;

      topicFilters.push(topicFilter.value);
    }

    return {
      type: 'unsubscribe',
      id,
      topicFilters,
    };
  },
};
