import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import type { ConnectPacket } from "./connect.ts";
import { decode, encode } from "./connect.ts";

const utf8Encoder = new TextEncoder();

Deno.test(
  "encodeConnectPacketWithClientId",
  function encodeConnectPacketWithClientId() {
    assertEquals(
      encode(
        {
          type: "connect",
          clientId: "id",
        },
        utf8Encoder,
      ),
      [
        // fixedHeader
        16, // packetType + flags
        14, // remainingLength
        // variableHeader
        0, // protocolNameLength MSB
        4, // protocolNameLength LSB
        77, // 'M'
        81, // 'Q'
        84, // 'T'
        84, // 'T'
        4, // protocolLevel
        2, // connectFlags (cleanSession)
        0, // keepAlive MSB
        0, // keepAlive LSB
        // payload
        // clientId
        0, // length MSB
        2, // length LSB
        105, // 'i'
        100, // 'd'
      ],
    );
  },
);

Deno.test(
  "encodeConnectPacketWithCleanFalse",
  function encodeConnectPacketWithCleanFalse() {
    assertEquals(
      encode(
        {
          type: "connect",
          clientId: "id",
          clean: false,
        },
        utf8Encoder,
      ),
      [
        // fixedHeader
        16, // packetType + flags
        14, // remainingLength
        // variableHeader
        0, // protocolNameLength MSB
        4, // protocolNameLength LSB
        77, // 'M'
        81, // 'Q'
        84, // 'T'
        84, // 'T'
        4, // protocolLevel
        0, // connectFlags
        0, // keepAlive MSB
        0, // keepAlive LSB
        // payload
        // clientId
        0, // length MSB
        2, // length LSB
        105, // 'i'
        100, // 'd'
      ],
    );
  },
);

Deno.test(
  "encodeConnectPacketWithKeepAlive",
  function encodeConnectPacketWithKeepAlive() {
    assertEquals(
      encode(
        {
          type: "connect",
          clientId: "id",
          keepAlive: 300,
        },
        utf8Encoder,
      ),
      [
        // fixedHeader
        16, // packetType + flags
        14, // remainingLength
        // variableHeader
        0, // protocolNameLength MSB
        4, // protocolNameLength LSB
        77, // 'M'
        81, // 'Q'
        84, // 'T'
        84, // 'T'
        4, // protocolLevel
        2, // connectFlags (cleanSession)
        1, // keepAlive MSB
        44, // keepAlive LSB
        // payload
        // clientId
        0, // length MSB
        2, // length LSB
        105, // 'i'
        100, // 'd'
      ],
    );
  },
);

Deno.test(
  "encodeConnectPacketWithUsernameAndPassword",
  function encodeConnectPacketWithUsernameAndPassword() {
    assertEquals(
      encode(
        {
          type: "connect",
          clientId: "id",
          username: "user",
          password: "pass",
        },
        utf8Encoder,
      ),
      [
        // fixedHeader
        16, // packetType + flags
        26, // remainingLength
        // variableHeader
        0, // protocolNameLength MSB
        4, // protocolNameLength LSB
        77, // 'M'
        81, // 'Q'
        84, // 'T'
        84, // 'T'
        4, // protocolLevel
        194, // connectFlags (usernameFlag, passwordFlag, cleanSession)
        0, // keepAlive MSB
        0, // keepAlive LSB
        // payload
        // clientId
        0, // length MSB
        2, // length LSB
        105, // 'i'
        100, // 'd'
        // username
        0, // length MSB
        4, // length LSB
        117, // 'u'
        115, // 's'
        101, // 'e'
        114, // 'r'
        // password
        0, // length MSB
        4, // length LSB
        112, // 'p'
        97, // 'a'
        115, // 's'
        115, // 's'
      ],
    );
  },
);

Deno.test(
  "decodeConnectPacketWithUsernameAndPassword",
  function decodeConnectPacketWithUsernameAndPassword() {
    assertEquals<ConnectPacket>(
      decode(
        Uint8Array.from([
          // fixedHeader
          16, // packetType + flags
          26, // remainingLength
          // variableHeader
          0, // protocolNameLength MSB
          4, // protocolNameLength LSB
          77, // 'M'
          81, // 'Q'
          84, // 'T'
          84, // 'T'
          4, // protocolLevel
          194, // connectFlags (usernameFlag, passwordFlag, cleanSession)
          0, // keepAlive MSB
          0, // keepAlive LSB
          // payload
          // clientId
          0, // length MSB
          2, // length LSB
          105, // 'i'
          100, // 'd'
          // username
          0, // length MSB
          4, // length LSB
          117, // 'u'
          115, // 's'
          101, // 'e'
          114, // 'r'
          // password
          0, // length MSB
          4, // length LSB
          112, // 'p'
          97, // 'a'
          115, // 's'
          115, // 's'
        ]),
        2,
        26,
        new TextDecoder(),
      ),
      {
        type: "connect",
        clientId: "id",
        protocolName: "MQTT",
        protocolLevel: 4,
        username: "user",
        password: "pass",
        will: undefined,
        clean: true,
        keepAlive: 0,
      },
    );
  },
);

Deno.test(
  "encodeConnectPacketWithLWT",
  function encodeConnectPacketWithCleanFalse() {
    assertEquals(
      encode(
        {
          type: "connect",
          clientId: "id",
          will: {
            qos: 1,
            retain: true,
            topic: "topic1",
            payload: "offline",
          },
        },
        utf8Encoder,
      ),
      [
        // fixedHeader
        16, // packetType + flags
        31, // remainingLength
        // variableHeader
        0, // protocolNameLength MSB
        4, // protocolNameLength LSB
        77, // 'M'
        81, // 'Q'
        84, // 'T'
        84, // 'T'
        4, // protocolLevel
        2 + 4 + 8 + 32, // connectFlags (cleanSession, Will Flag, QOS 1, retain)
        0, // keepAlive MSB
        0, // keepAlive LSB
        // payload
        // clientId
        0, // length MSB
        2, // length LSB
        105, // 'i'
        100, // 'd'
        // LWT topic
        0, // length MSB
        6, // length LSB
        116, // 't'
        111, // 'o'
        112, // 'p'
        105, // 'i'
        99, // 'c'
        49, // '1'
        // LWT Payload
        0, // length MSB
        7, // length LSB
        111, // 'o'
        102, // 'f'
        102, // 'f'
        108, // 'l'
        105, // 'i'
        110, // 'n'
        101, // 'e'
      ],
    );
  },
);

Deno.test(
  "decodeConnectPacketWithLWT",
  function encodeConnectPacketWithCleanFalse() {
    assertEquals(
      decode(
        Uint8Array.from(
          [
            // fixedHeader
            16, // packetType + flags
            31, // remainingLength
            // variableHeader
            0, // protocolNameLength MSB
            4, // protocolNameLength LSB
            77, // 'M'
            81, // 'Q'
            84, // 'T'
            84, // 'T'
            4, // protocolLevel
            2 + 4 + 8 + 32, // connectFlags (cleanSession, Will Flag, QOS 1, retain)
            0, // keepAlive MSB
            0, // keepAlive LSB
            // payload
            // clientId
            0, // length MSB
            2, // length LSB
            105, // 'i'
            100, // 'd'
            // LWT topic
            0, // length MSB
            6, // length LSB
            116, // 't'
            111, // 'o'
            112, // 'p'
            105, // 'i'
            99, // 'c'
            49, // '1'
            // LWT Payload
            0, // length MSB
            7, // length LSB
            111, // 'o'
            102, // 'f'
            102, // 'f'
            108, // 'l'
            105, // 'i'
            110, // 'n'
            101, // 'e'
          ],
        ),
        2,
        26,
        new TextDecoder(),
      ),
      {
        type: "connect",
        protocolName: "MQTT",
        protocolLevel: 4,
        clientId: "id",
        username: undefined,
        password: undefined,
        will: {
          qos: 1,
          retain: true,
          topic: "topic1",
          payload: utf8Encoder.encode("offline"),
        },
        clean: true,
        keepAlive: 0,
      },
    );
  },
);
