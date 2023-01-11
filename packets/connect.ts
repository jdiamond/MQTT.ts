import { decodeBinaryValue, encodeBinaryValue } from "./binary.ts";
import { encodeLength } from "./length.ts";
import { PublishPayload } from "./publish.ts";
import {
  decodeUTF8String,
  encodeUTF8String,
  UTF8Decoder,
  UTF8Encoder,
} from "./utf8.ts";

export interface ConnectPacket {
  type: "connect";
  protocolName?: string;
  protocolLevel?: number;
  clientId: string;
  username?: string;
  password?: string;
  will?: {
    retain: boolean;
    qos: 0 | 1 | 2;
    topic: string;
    payload: PublishPayload;
  };
  clean?: boolean;
  keepAlive?: number;
}

export function encode(packet: ConnectPacket, utf8Encoder: UTF8Encoder) {
  const packetType = 1;
  const flags = 0;

  const protocolName = encodeUTF8String("MQTT", utf8Encoder);
  const protocolLevel = 4;

  const usernameFlag = !!packet.username;
  const passwordFlag = usernameFlag && !!packet.password;
  const willRetain = packet?.will?.retain ?? false;
  const willQoS = packet?.will?.qos ?? 0;
  const willFlag = !!packet.will;
  const cleanSession = packet.clean || typeof packet.clean === "undefined";
  const connectFlags = (usernameFlag ? 128 : 0) +
    (passwordFlag ? 64 : 0) +
    (willRetain ? 32 : 0) +
    (willQoS << 3) +
    (willFlag ? 4 : 0) +
    (cleanSession ? 2 : 0);

  const keepAlive = packet.keepAlive && typeof packet.keepAlive !== "undefined"
    ? packet.keepAlive
    : 0;

  const variableHeader = [
    ...protocolName,
    protocolLevel,
    connectFlags,
    keepAlive >> 8,
    keepAlive & 0xff,
  ];

  const encodeStr = (str: string) => encodeUTF8String(str, utf8Encoder);

  const payload = [...encodeStr(packet.clientId)];

  if (typeof packet.will !== "undefined") {
    payload.push(...encodeStr(packet.will.topic));

    if (typeof packet.will.payload === "string") {
      payload.push(...encodeStr(packet.will.payload));
    } else {
      payload.push(...encodeBinaryValue(packet.will.payload));
    }
  }

  if (usernameFlag) {
    payload.push(...encodeStr(packet.username!));
  }

  if (passwordFlag) {
    payload.push(...encodeStr(packet.password!));
  }

  const fixedHeader = [
    (packetType << 4) | flags,
    ...encodeLength(variableHeader.length + payload.length),
  ];

  return Uint8Array.from([...fixedHeader, ...variableHeader, ...payload]);
}

export function decode(
  buffer: Uint8Array,
  remainingStart: number,
  _remainingLength: number,
  utf8Decoder: UTF8Decoder,
): ConnectPacket {
  let readOffset = remainingStart;

  const protocolName = decodeUTF8String(buffer, readOffset, utf8Decoder);
  readOffset += protocolName.length;

  const protocolLevel = buffer[readOffset];
  readOffset += 1;

  const connectFlags = buffer[readOffset];
  readOffset += 1;
  const usernameFlag = !!(connectFlags & 128);
  const passwordFlag = !!(connectFlags & 64);
  const willRetain = !!(connectFlags & 32);
  const willQoS = (connectFlags & (16 + 8)) >> 3;
  const willFlag = !!(connectFlags & 4);
  const cleanSession = !!(connectFlags & 2);

  if (willQoS !== 0 && willQoS !== 1 && willQoS !== 2) {
    throw new Error("invalid will qos");
  }

  const keepAlive = (buffer[readOffset] << 8) + buffer[readOffset + 1];
  readOffset += 2;

  const clientId = decodeUTF8String(buffer, readOffset, utf8Decoder);
  readOffset += clientId.length;

  let willTopic: string | undefined = undefined;
  let willPayload: Uint8Array | undefined = undefined;
  let username: string | undefined = undefined;
  let password: string | undefined = undefined;

  if (willFlag) {
    const topic = decodeUTF8String(buffer, readOffset, utf8Decoder);
    willTopic = topic.value;
    readOffset += topic.length;

    const payload = decodeBinaryValue(buffer, readOffset);
    willPayload = payload.value;
    readOffset += topic.length;
  }

  if (usernameFlag) {
    const res = decodeUTF8String(buffer, readOffset, utf8Decoder);
    readOffset += res.length;
    username = res.value;
  }

  if (passwordFlag) {
    const res = decodeUTF8String(buffer, readOffset, utf8Decoder);
    readOffset += res.length;
    password = res.value;
  }

  return {
    type: "connect",
    protocolName: protocolName.value,
    protocolLevel,
    clientId: clientId.value,
    username: username,
    password: password,
    will: willFlag
      ? {
        retain: willRetain,
        qos: willQoS,
        payload: willPayload ?? "",
        topic: willTopic ?? "",
      }
      : undefined,
    clean: cleanSession,
    keepAlive,
  };
}
