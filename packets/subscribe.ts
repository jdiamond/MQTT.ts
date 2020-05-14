import { encodeLength } from './length.ts';
import { UTF8Encoder, encodeUTF8String } from './utf8.ts';

export interface SubscribePacket {
  type: 'subscribe';
  id: number;
  subscriptions: Subscription[];
}

export type Subscription = {
  topic: string;
  qos: 0 | 1 | 2;
};

export default {
  encode(packet: SubscribePacket, utf8Encoder: UTF8Encoder) {
    const packetType = 8;
    const flags = 2;

    const variableHeader = [packet.id >> 8, packet.id & 0xff];

    const payload = [];

    for (const sub of packet.subscriptions) {
      payload.push(...encodeUTF8String(sub.topic, utf8Encoder), sub.qos);
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
  ): SubscribePacket {
    throw new Error('subscribe.decode is not implemented yet');
  },
};
