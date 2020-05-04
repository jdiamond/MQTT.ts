import BaseClient, { ClientOptions } from './base.ts';

export type NodeClientOptions = ClientOptions & {};

declare function require(moduleName: 'net'): Net;
declare interface Net {
  connect(
    options: { host: string; port: number },
    connectListener: Function
  ): Socket;
}
declare interface Socket {
  on(eventName: string, listener: Function): void;
  write(bytes: Uint8Array): void;
  end(): void;
}

const net = require('net');

export default class NodeClient extends BaseClient {
  private socket: Socket | undefined;

  constructor(options: NodeClientOptions) {
    super(options);
  }

  protected async open(): Promise<void> {
    const { host = 'localhost', port = 1883 } = this.options;

    this.log(`opening connection to ${host}:${port}`);

    return new Promise((resolve, reject) => {
      this.socket = net.connect(
        {
          host,
          port,
        },
        () => {
          resolve();
        }
      );

      this.socket.on('end', () => {
        reject(new Error('connection closed'));
      });
    });
  }

  protected async startReading() {
    if (!this.socket) {
      throw new Error('no connection');
    }

    this.socket.on('data', (bytes: Uint8Array) => {
      this.log('received bytes', bytes);

      this.bytesReceived(bytes);
    });
  }

  protected async write(bytes: Uint8Array) {
    if (!this.socket) {
      throw new Error('no connection');
    }

    this.log('writing bytes', bytes);

    this.socket.write(bytes);
  }

  protected async close() {
    if (!this.socket) {
      throw new Error('no connection');
    }

    this.socket.end();
  }

  protected log(msg: string, ...args: unknown[]) {
    console.log(msg, ...args);
  }
}
