import BaseClient, { ClientOptions } from './base.ts';

export type BrowserClientOptions = ClientOptions & {};

declare class WebSocket {
  constructor(url: string, protocol: string);
  binaryType: string;
  addEventListener(eventName: string, listener: (message: any) => void): void;
  removeEventListener(
    eventName: string,
    listener: (message: any) => void
  ): void;
  send(data: Uint8Array): void;
  close(): void;
}

export default class BrowserClient extends BaseClient {
  private ws: WebSocket | undefined;

  constructor(options: BrowserClientOptions) {
    super(options);
  }

  protected async open() {
    const url = `ws://${this.options.host}:${this.options.port}`;

    this.log(`opening connection to ${url}`);

    this.ws = new WebSocket(url, 'mqtt');

    const ws = this.ws;

    ws.binaryType = 'arraybuffer';

    return new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        this.log('connection made');

        removeListeners();

        resolve();
      };

      const onError = (err: Error) => {
        this.log('connection error');

        removeListeners();

        reject(err);
      };

      const removeListeners = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
      };

      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onError);
    });
  }

  protected async startReading() {
    if (!this.ws) {
      throw new Error('no connection');
    }

    this.ws.addEventListener('message', (message) => {
      const bytes = new Uint8Array(message.data);

      this.log('received bytes', bytes);

      this.bytesReceived(bytes);
    });
  }

  protected async write(bytes: Uint8Array) {
    if (!this.ws) {
      throw new Error('no connection');
    }

    this.log('writing bytes', bytes);

    this.ws.send(bytes);
  }

  protected async close() {
    if (!this.ws) {
      throw new Error('no connection');
    }

    this.ws.close();
  }

  protected log(msg: string, ...args: unknown[]) {
    console.log(msg, ...args);
  }
}
