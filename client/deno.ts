import { BaseClient, BaseClientOptions } from './base.ts';
import { AnyPacket } from '../packets/mod.ts';

export type ClientOptions = BaseClientOptions & {};

const DEFAULT_BUF_SIZE = 4096;

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

export class Client extends BaseClient<ClientOptions> {
  private conn: Deno.Conn | undefined;
  private closing = false;

  constructor(options: ClientOptions) {
    super(options);
  }

  protected async open() {
    const conn = await Deno.connect({
      hostname: this.options.host || 'localhost',
      port: this.options.port || 1883,
    });

    this.conn = conn;
    this.closing = false;

    // This loops forever (until the connection is closed) so it gets invoked
    // without `await` so it doesn't block opening the connection.
    (async () => {
      const buffer = new Uint8Array(DEFAULT_BUF_SIZE);

      while (true) {
        let bytesRead = null;

        try {
          this.log('reading');

          bytesRead = await conn.read(buffer);
        } catch (err) {
          if (this.closing && err.name === 'BadResource') {
            // Not sure why this exception gets thrown after closing the
            // connection. See my issue at
            // https://github.com/denoland/deno/issues/5194.
          } else {
            this.log('caught error while reading', err);

            this.connectionClosed();
          }

          break;
        }

        if (bytesRead === null) {
          this.log('read stream closed');

          this.connectionClosed();

          break;
        }

        this.bytesReceived(buffer.slice(0, bytesRead));
      }
    })().then(
      () => {},
      () => {}
    );
  }

  protected async write(bytes: Uint8Array) {
    if (!this.conn) {
      throw new Error('no connection');
    }

    this.log('writing bytes', bytes);

    await this.conn.write(bytes);
  }

  protected async close() {
    if (!this.conn) {
      throw new Error('no connection');
    }

    this.closing = true;

    this.conn.close();
  }

  protected encode(packet: AnyPacket) {
    return super.encode(packet, utf8Encoder);
  }

  protected decode(bytes: Uint8Array) {
    return super.decode(bytes, utf8Decoder);
  }
}
