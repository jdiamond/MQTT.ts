import {
  Client as BaseClient,
  ClientOptions as BaseClientOptions,
} from "./base_client.ts";
import { AnyPacket } from "../packets/mod.ts";

type TestClientOptions = BaseClientOptions & {
  openRejects?: number;
};

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

export class TestClient extends BaseClient {
  declare options: TestClientOptions;
  sentPackets: AnyPacket[] = [];
  receivedPackets: AnyPacket[] = [];
  timerCallbacks: { [key: string]: (...args: unknown[]) => void } = {};
  openCalls = 0;

  constructor(options: TestClientOptions = {}) {
    super({
      ...options,
      // logger: console.log,
    });
  }

  getUTF8Encoder() {
    return utf8Encoder;
  }

  getUTF8Decoder() {
    return utf8Decoder;
  }

  // These methods must be overridden by BaseClient subclasses:
  protected getDefaultURL() {
    return "mqtt://localhost";
  }

  protected validateURL() {}

  protected open() {
    this.openCalls++;

    if (
      this.options.openRejects &&
      this.openCalls <= this.options.openRejects
    ) {
      return Promise.reject(new Error("nope"));
    }

    return Promise.resolve();
  }

  protected write(bytes: Uint8Array) {
    const packet = this.decode(bytes);

    this.sentPackets.push(packet!);

    return Promise.resolve();
  }

  protected close() {
    this.connectionClosed();

    return Promise.resolve();
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
