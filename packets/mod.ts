import { decodeLength } from "./length.ts";
import { UTF8Decoder, UTF8Encoder } from "./utf8.ts";
import connect, { ConnectPacket } from "./connect.ts";
import connack, { ConnackPacket } from "./connack.ts";
import publish, { PublishPacket } from "./publish.ts";
import puback, { PubackPacket } from "./puback.ts";
import pubrec, { PubrecPacket } from "./pubrec.ts";
import pubrel, { PubrelPacket } from "./pubrel.ts";
import pubcomp, { PubcompPacket } from "./pubcomp.ts";
import subscribe, { SubscribePacket } from "./subscribe.ts";
import suback, { SubackPacket } from "./suback.ts";
import unsubscribe, { UnsubscribePacket } from "./unsubscribe.ts";
import unsuback, { UnsubackPacket } from "./unsuback.ts";
import pingreq, { PingreqPacket } from "./pingreq.ts";
import pingres, { PingresPacket } from "./pingres.ts";
import disconnect, { DisconnectPacket } from "./disconnect.ts";

export type AnyPacket =
  | ConnectPacket
  | ConnackPacket
  | PublishPacket
  | PubackPacket
  | PubrecPacket
  | PubrelPacket
  | PubcompPacket
  | SubscribePacket
  | SubackPacket
  | UnsubscribePacket
  | UnsubackPacket
  | PingreqPacket
  | PingresPacket
  | DisconnectPacket;

export type AnyPacketWithLength = AnyPacket & { length: number };

export type {
  ConnackPacket,
  ConnectPacket,
  DisconnectPacket,
  PingreqPacket,
  PingresPacket,
  PubackPacket,
  PubcompPacket,
  PublishPacket,
  PubrecPacket,
  PubrelPacket,
  SubackPacket,
  SubscribePacket,
  UnsubackPacket,
  UnsubscribePacket,
};

type PacketTypes = {
  connect: ConnectPacket;
  connack: ConnackPacket;
  publish: PublishPacket;
  puback: PubackPacket;
  pubrec: PubrecPacket;
  pubrel: PubrelPacket;
  pubcomp: PubcompPacket;
  subscribe: SubscribePacket;
  suback: SubackPacket;
  unsubscribe: UnsubscribePacket;
  unsuback: UnsubackPacket;
  pingreq: PingreqPacket;
  pingres: PingresPacket;
  disconnect: DisconnectPacket;
};

type Encoder<T> = (packet: T, utf8Encoder: UTF8Encoder) => Uint8Array;

type Encoders = {
  [K in keyof PacketTypes]: Encoder<PacketTypes[K]>;
};

const encoders: Encoders = {
  connect: connect.encode,
  connack: connack.encode,
  publish: publish.encode,
  puback: puback.encode,
  pubrec: pubrec.encode,
  pubrel: pubrel.encode,
  pubcomp: pubcomp.encode,
  subscribe: subscribe.encode,
  suback: suback.encode,
  unsubscribe: unsubscribe.encode,
  unsuback: unsuback.encode,
  pingreq: pingreq.encode,
  pingres: pingres.encode,
  disconnect: disconnect.encode,
};

function getEncoder<K extends keyof PacketTypes>(
  type: K
): Encoder<PacketTypes[K]> {
  return encoders[type];
}

const packetTypesById = [
  null,
  connect, // 1
  connack, // 2
  publish, // 3
  puback, // 4
  pubrec, // 5
  pubrel, // 6
  pubcomp, // 7
  subscribe, // 8
  suback, // 9
  unsubscribe, // 10
  unsuback, // 11
  pingreq, // 12
  pingres, // 13
  disconnect, // 14
];

export function encode<T extends AnyPacket>(
  packet: T,
  utf8Encoder: UTF8Encoder
): Uint8Array {
  const encoder = getEncoder(packet.type);

  return encoder(packet, utf8Encoder);
}

export function decode(
  buffer: Uint8Array,
  utf8Decoder: UTF8Decoder
): AnyPacketWithLength | null {
  if (buffer.length < 2) {
    return null;
  }

  const id = buffer[0] >> 4;
  // deno-lint-ignore no-explicit-any
  const packetType: any = packetTypesById[id];

  if (!packetType) {
    throw new Error(`packet type ${id} cannot be decoded`);
  }

  const { length: remainingLength, bytesUsedToEncodeLength } = decodeLength(
    buffer,
    1
  );

  const packetLength = 1 + bytesUsedToEncodeLength + remainingLength;

  if (buffer.length < packetLength) {
    return null;
  }

  const packet = packetType.decode(
    buffer,
    1 + bytesUsedToEncodeLength,
    remainingLength,
    utf8Decoder
  );

  if (!packet) {
    return null;
  }

  const packetWithLength = <AnyPacketWithLength>packet;

  packetWithLength.length = packetLength;

  return packetWithLength;
}
