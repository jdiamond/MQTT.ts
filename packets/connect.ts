import { encodeLength } from './length.ts';
import {
  UTF8Encoder,
  UTF8Decoder,
  encodeUTF8String,
  decodeUTF8String,
} from './utf8.ts';

export interface ConnectPacket {
  type: 'connect';
  protocolName?: string;
  protocolLevel?: number;
  clientId: string;
  username?: string;
  password?: string;
  will?: {
    retain?: boolean;
    qos?: 0 | 1 | 2;
  };
  clean?: boolean;
  keepAlive?: number;
}

export default {
  encode(packet: ConnectPacket, utf8Encoder: UTF8Encoder) {
    const packetType = 1;
    const flags = 0;

    const protocolName = encodeUTF8String('MQTT', utf8Encoder);
    const protocolLevel = 4;

    const usernameFlag = !!packet.username;
    const passwordFlag = !!packet.password;
    const willRetain = !!(packet.will && packet.will.retain);
    const willQoS = (packet.will && packet.will.qos) || 0;
    const willFlag = !!packet.will;
    const cleanSession = packet.clean || typeof packet.clean === 'undefined';
    const connectFlags =
      (usernameFlag ? 128 : 0) +
      (passwordFlag ? 64 : 0) +
      (willRetain ? 32 : 0) +
      (willQoS & 2 ? 16 : 0) +
      (willQoS & 1 ? 8 : 0) +
      (willFlag ? 4 : 0) +
      (cleanSession ? 2 : 0);

    const keepAlive =
      packet.keepAlive && typeof packet.keepAlive !== 'undefined'
        ? packet.keepAlive
        : 0;

    const variableHeader = [
      ...protocolName,
      protocolLevel,
      connectFlags,
      keepAlive >> 8,
      keepAlive & 0xff,
    ];

    const payload = [...encodeUTF8String(packet.clientId, utf8Encoder)];

    if (packet.username) {
      payload.push(...encodeUTF8String(packet.username, utf8Encoder));
    }

    if (packet.password) {
      payload.push(...encodeUTF8String(packet.password, utf8Encoder));
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
  ): ConnectPacket {
    const protocolNameStart = remainingStart;
    const protocolName = decodeUTF8String(
      buffer,
      protocolNameStart,
      utf8Decoder
    );

    const protocolLevelIndex = protocolNameStart + protocolName.length;
    const protocolLevel = buffer[protocolLevelIndex];

    const connectFlagsIndex = protocolLevelIndex + 1;
    const connectFlags = buffer[connectFlagsIndex];
    const usernameFlag = !!(connectFlags & 128);
    const passwordFlag = !!(connectFlags & 64);
    const willRetain = !!(connectFlags & 32);
    const willQoS = (connectFlags & (16 + 8)) >> 3;
    const willFlag = !!(connectFlags & 4);
    const cleanSession = !!(connectFlags & 2);

    if (willQoS !== 0 && willQoS !== 1 && willQoS !== 2) {
      throw new Error('invalid will qos');
    }

    const keepAliveIndex = connectFlagsIndex + 1;
    const keepAlive =
      (buffer[keepAliveIndex] << 8) + buffer[keepAliveIndex + 1];

    const clientIdStart = keepAliveIndex + 2;
    const clientId = decodeUTF8String(buffer, clientIdStart, utf8Decoder);

    let username;
    let password;

    const usernameStart = clientIdStart + clientId.length;

    if (usernameFlag) {
      username = decodeUTF8String(buffer, usernameStart, utf8Decoder);
    }

    if (passwordFlag) {
      const passwordStart = usernameStart + (username ? username.length : 0);
      password = decodeUTF8String(buffer, passwordStart, utf8Decoder);
    }

    return {
      type: 'connect',
      protocolName: protocolName.value,
      protocolLevel,
      clientId: clientId.value,
      username: username ? username.value : undefined,
      password: password ? password.value : undefined,
      will: willFlag
        ? {
            retain: willRetain,
            qos: willQoS,
          }
        : undefined,
      clean: cleanSession,
      keepAlive,
    };
  },
};
