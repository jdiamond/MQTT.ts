import {
  Client as BaseClient,
  ClientOptions as BaseClientOptions,
} from "../client/base_client.ts";

export type ClientOptions = BaseClientOptions & {
  certFile?: string;
};

const DEFAULT_BUF_SIZE = 4096;

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

export class Client extends BaseClient {
  declare options: ClientOptions;
  private conn: Deno.Conn | undefined;
  private closing = false;

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
    if (url.protocol !== "mqtt:" && url.protocol !== "mqtts:") {
      throw new Error(`URL protocol must be mqtt or mqtts`);
    }
  }

  protected async open(url: URL) {
    // TODO: check for permission denied error and show a helpful message and avoid reconnect?

    let conn;

    if (url.protocol === "mqtt:") {
      conn = await Deno.connect({
        hostname: url.hostname,
        port: Number(url.port),
      });
    } else if (url.protocol === "mqtts:") {
      // console.log(this.options.certFile);

      conn = await Deno.connectTls({
        hostname: url.hostname,
        port: Number(url.port),
        certFile: this.options.certFile,
      });
    } else {
      throw new Error(`unknown URL protocol ${url.protocol.slice(0, -1)}`);
    }

    this.conn = conn;
    this.closing = false;

    // This loops forever (until the connection is closed) so it gets invoked
    // without `await` so it doesn't block opening the connection.
    (async () => {
      const buffer = new Uint8Array(DEFAULT_BUF_SIZE);

      while (true) {
        let bytesRead = null;

        try {
          this.log("reading");

          bytesRead = await conn.read(buffer);
        } catch (err) {
          if (
            this.closing &&
            (err.name === "BadResource" || err.name === "Interrupted")
          ) {
            // Not sure why this exception gets thrown after closing the
            // connection. See my issue at
            // https://github.com/denoland/deno/issues/5194. Also not sure when
            // the error name changed from "BadResource" to "Interrupted".
          } else {
            this.log("caught error while reading", err);

            this.connectionClosed();
          }

          break;
        }

        if (bytesRead === null) {
          this.log("read stream closed");

          this.connectionClosed();

          break;
        }

        this.bytesReceived(buffer.slice(0, bytesRead));
      }
    })().then(
      () => {},
      () => {},
    );
  }

  protected async write(bytes: Uint8Array) {
    if (!this.conn) {
      throw new Error("no connection");
    }

    this.log("writing bytes", bytes);

    await this.conn.write(bytes);
  }

  protected close() {
    if (!this.conn) {
      return Promise.reject(new Error("no connection"));
    }

    this.closing = true;

    this.conn.close();

    return Promise.resolve();
  }
}
