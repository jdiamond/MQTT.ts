import { BaseClient, BaseClientOptions } from './base.ts';

export type ClientOptions = BaseClientOptions & {};

declare function require(moduleName: 'net'): Net;
declare interface Net {
  connect(
    options: { host: string; port: number },
    connectListener: Function
  ): Socket;
}
declare interface Socket {
  on(eventName: string, listener: Function): void;
  once(eventName: string, listener: Function): void;
  write(bytes: Uint8Array, cb: Function): void;
  end(): void;
}

const net = require('net');

export class Client extends BaseClient<ClientOptions> {
  private socket: Socket | null = null;

  constructor(options: ClientOptions = {}) {
    super(options);
  }

  protected async open() {
    const { host = 'localhost', port = 1883 } = this.options;

    this.log(`opening connection to ${host}:${port}`);

    return new Promise<void>((resolve, reject) => {
      // This function is asynchronous. When the connection is established, the
      // 'connect' event will be emitted. If there is a problem connecting,
      // instead of a 'connect' event, an 'error' event will be emitted with the
      // error passed to the 'error' listener. The last parameter
      // connectListener, if supplied, will be added as a listener for the
      // 'connect' event once.
      // https://nodejs.org/dist/latest-v12.x/docs/api/net.html#net_socket_connect

      const socket = net.connect(
        {
          host,
          port,
        },
        () => {
          resolve();
        }
      );

      this.socket = socket;

      socket.once('error', (err: Error) => {
        reject(err);
      });

      socket.on('data', (bytes: Uint8Array) => {
        this.bytesReceived(bytes);
      });

      socket.on('end', () => {
        this.connectionClosed();
      });
    });
  }

  protected async write(bytes: Uint8Array) {
    if (!this.socket) {
      throw new Error('no connection');
    }

    const socket = this.socket;

    this.log('writing bytes', bytes);

    return new Promise<void>((resolve, reject) => {
      // The writable.write() method writes some data to the stream, and calls
      // the supplied callback once the data has been fully handled. If an error
      // occurs, the callback may or may not be called with the error as its
      // first argument. To reliably detect write errors, add a listener for the
      // 'error' event.
      // https://nodejs.org/dist/latest-v12.x/docs/api/stream.html#stream_writable_write_chunk_encoding_callback

      socket.once('error', (err: Error) => {
        reject(err);
      });

      socket.write(bytes, (err: Error) => {
        if (!err) {
          resolve();
        }
      });
    });
  }

  protected async close() {
    if (!this.socket) {
      throw new Error('no connection');
    }

    // Afer this method gets called, the listener for the end event added in the
    // open method will get called.
    this.socket.end();

    this.socket = null;
  }
}
