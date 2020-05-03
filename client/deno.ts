import BaseClient from './base.ts';
import { BufReader } from 'https://deno.land/std/io/bufio.ts';
import { decodeLength } from '../packets/length.ts';

export default class DenoClient extends BaseClient {
  private conn: Deno.Conn | undefined;

  protected async open() {
    this.conn = await Deno.connect({
      hostname: this.options.host || 'localhost',
      port: this.options.port || 1883,
    });
  }

  protected async startReading() {
    if (!this.conn) {
      throw new Error('no connection');
    }

    const bufReader = new BufReader(this.conn);

    while (true) {
      let n = 1;
      let header: Uint8Array | null;

      do {
        header = await bufReader.peek(++n);
      } while (n <= 5 && header !== null && (header[n - 1] & 128) !== 0);

      if (header === null) {
        this.connectionClosed();
        break;
      } else if (header.length < n) {
        this.connectionClosed();
        break;
      } else {
        const remainingLength = decodeLength(header, 1);
        const buf = new Uint8Array(n + remainingLength.length);

        bufReader.readFull(buf);

        this.bytesReceived(buf);
      }
    }
  }

  protected async write(bytes: Uint8Array) {
    if (!this.conn) {
      throw new Error('no connection');
    }

    try {
      this.log(bytes);
      await this.conn.write(bytes);
    } catch (err) {
      this.log('caught error while writing');
    }
  }

  protected async close() {
    if (!this.conn) {
      throw new Error('no connection');
    }

    this.conn.close();
  }
}
