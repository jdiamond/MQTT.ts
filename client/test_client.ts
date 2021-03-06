import {
  Client as BaseClient,
  ClientOptions as BaseClientOptions,
} from './base_client.ts';
import { AnyPacket } from '../packets/mod.ts';

type TestClientOptions = BaseClientOptions & {
  openRejects?: number;
};

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

export class TestClient extends BaseClient {
  declare options: TestClientOptions;
  sentPackets: AnyPacket[] = [];
  receivedPackets: AnyPacket[] = [];
  timerCallbacks: { [key: string]: Function } = {};
  openCalls: number = 0;

  constructor(options: TestClientOptions = {}) {
    super({
      ...options,
      // logger: console.log,
    });
  }

  // These methods must be overridden by BaseClient subclasses:
  protected getDefaultURL() {
    return 'mqtt://localhost';
  }

  protected validateURL() {}

  protected async open() {
    this.openCalls++;
    if (
      this.options.openRejects &&
      this.openCalls <= this.options.openRejects
    ) {
      throw new Error('nope');
    }
  }

  protected async write(bytes: Uint8Array) {
    const packet = this.decode(bytes);
    this.sentPackets.push(packet!);
  }

  protected async close() {
    this.connectionClosed();
  }

  protected encode(packet: AnyPacket) {
    return super.encode(packet, utf8Encoder);
  }

  protected decode(bytes: Uint8Array) {
    return super.decode(bytes, utf8Decoder);
  }

  // Receive packet from a test.
  testReceivePacket(
    packet: AnyPacket,
    options: {
      trickle?: boolean;
    } = {}
  ) {
    this.testReceiveBytes(this.encode(packet), options);
  }

  // Receive bytes from a test.
  testReceiveBytes(
    bytes: Uint8Array,
    options: {
      trickle?: boolean;
    } = {}
  ) {
    if (options.trickle) {
      for (let i = 0; i < bytes.length; i++) {
        this.bytesReceived(bytes.slice(i, i + 1));
      }
    } else {
      this.bytesReceived(bytes);
    }
  }

  // Capture packets received after decoded by the client.
  protected packetReceived(packet: AnyPacket) {
    this.receivedPackets.push(packet);
    // Let the base client process the packet.
    super.packetReceived(packet);
  }

  // Close the connection from a test.
  testCloseConnection() {
    this.connectionClosed();
  }

  // These methods are here to simulate timers without actually passing time:
  protected startTimer(
    name: string,
    cb: (...args: unknown[]) => void,
    _delay: number
  ) {
    this.timerCallbacks[name] = cb;
  }

  protected stopTimer(_name: string) {}

  protected timerExists(name: string) {
    return !!this.timerCallbacks[name];
  }

  // Trigger a timer from a test.
  testTriggerTimer(name: string) {
    this.timerCallbacks[name]();
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(() => resolve(), ms));
  }
}
