import {
  Client as BaseClient,
  ClientEventListener,
  ClientOptions as BaseClientOptions,
} from "../client/base_client.ts";

// This client doesn't have any extra options.
export type ClientOptions = BaseClientOptions;

declare function require(moduleName: "net"): Net;
declare interface Net {
  connect(
    options: { host: string; port: number },
    connectListener: ClientEventListener,
  ): Socket;
}
declare interface Socket {
  on(eventName: string, listener: ClientEventListener): void;
  write(bytes: Uint8Array, cb: (err: Error | null) => void): void;
  end(): void;
}
declare class Buffer {
  static from(str: string, encoding: string): Uint8Array;
  static from(bytes: Uint8Array): { toString(encoding: string): string };
}

const net = require("net");

const utf8Encoder = {
  encode(str?: string | undefined) {
    return Buffer.from(str || "", "utf8");
  },
};

const utf8Decoder = {
  decode(bytes: Uint8Array) {
    return Buffer.from(bytes).toString("utf8");
  },
};

export class Client extends BaseClient {
  private socket: Socket | null = null;
  private socketState: undefined | "connecting" | "connected" | "failed";

  constructor(options?: ClientOptions) {
    super(options);
  }

  getUTF8Encoder() {
    return utf8Encoder;
  }

  getUTF8Decoder() {
    return utf8Decoder;
  }

  protected getDefaultURL() {
    return "mqtt://localhost";
  }

  protected validateURL(url: URL) {
    // TODO: add mqtts
    if (url.protocol !== "mqtt:") {
      throw new Error(`URL protocol must be mqtt`);
    }
  }

  protected open(url: URL) {
    this.socketState = "connecting";

    return new Promise<void>((resolve, reject) => {
      const socket = net.connect(
        {
          host: url.hostname,
          port: Number(url.port),
        },
        () => {
          this.socketState = "connected";

          resolve();
        },
      );

      this.socket = socket;

      // From the Node.js documentation:
      //
      // This function is asynchronous. When the connection is established, the
      // 'connect' event will be emitted. If there is a problem connecting,
      // instead of a 'connect' event, an 'error' event will be emitted with the
      // error passed to the 'error' listener. The last parameter
      // connectListener, if supplied, will be added as a listener for the
      // 'connect' event once.
      //
      // https://nodejs.org/dist/latest-v12.x/docs/api/net.html#net_socket_connect

      socket.on("error", (err: Error) => {
        if (this.socketState === "connecting") {
          this.socketState = "failed";

          reject(err);
        }
      });

      socket.on("end", () => {
        this.connectionClosed();
      });

      socket.on("data", (bytes: Uint8Array) => {
        this.bytesReceived(bytes);
      });
    });
  }

  protected write(bytes: Uint8Array) {
    if (!this.socket) {
      return Promise.reject(new Error("no connection"));
    }

    const socket = this.socket;

    this.log("writing bytes", bytes);

    return new Promise<void>((resolve, _reject) => {
      // From the Node.js documentation:
      //
      // The writable.write() method writes some data to the stream, and calls
      // the supplied callback once the data has been fully handled. If an error
      // occurs, the callback may or may not be called with the error as its
      // first argument. To reliably detect write errors, add a listener for the
      // 'error' event.
      //
      // https://nodejs.org/dist/latest-v12.x/docs/api/stream.html#stream_writable_write_chunk_encoding_callback
      //
      // We already add a listener for error events when the connection is opened
      // so this function will do nothing when it receives an error.

      socket.write(bytes, (err) => {
        if (!err) {
          resolve();
        }
      });
    });
  }

  protected close() {
    if (!this.socket) {
      return Promise.reject(new Error("no connection"));
    }

    // Afer this method gets called, the listener for the end event added in the
    // open method will get called.
    this.socket.end();

    this.socket = null;

    return Promise.resolve();
  }
}
