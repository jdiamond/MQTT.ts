import BaseClient, { ClientOptions } from './base.ts';
import * as log from 'https://deno.land/std/log/mod.ts';
import { Logger, LogRecord } from 'https://deno.land/std/log/logger.ts';
import { LevelName } from 'https://deno.land/std/log/levels.ts';
import { decodeLength } from '../packets/length.ts';
import { BufReader } from 'https://deno.land/std/io/bufio.ts';

export type DenoClientOptions = ClientOptions & {
  logger?: Logger;
};

export default class DenoClient extends BaseClient {
  private conn: Deno.Conn | undefined;
  private logger: Logger;

  constructor(options: DenoClientOptions) {
    super(options);

    this.logger = options.logger || log.getLogger();
  }

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
      let header: Uint8Array | null;
      // The first byte is for the packet type.
      let n = 1;

      try {
        // Peek from 2 to 5 bytes (1 for the packet type plus 1 to 4 for the
        // length). We stop peeking once the last bytes has bit 7 clear.
        do {
          header = await bufReader.peek(++n);
        } while (header !== null && (header[n - 1] & 128) !== 0 && n < 5);
      } catch (err) {
        this.log('caught error calling bufReader.peek');
        this.connectionClosed();
        break;
      }

      if (header === null) {
        // When `peek` returns null, it means we've reached the end of the
        // stream (the connection was closed).
        this.connectionClosed();
        break;
      } else if (header.length < n) {
        // When `peek` returns less bytes than we asked for, it also means we've
        // reached the end of the stream (the connection was closed).
        this.connectionClosed();
        break;
      } else {
        const remainingLength = decodeLength(header, 1);
        const buf = new Uint8Array(n + remainingLength.length);

        try {
          const result = await bufReader.readFull(buf);

          if (result === null) {
            // When `readFull` returns null, it means the stream (connection) was
            // closed with no bytes left in the buffer. We shouldn't have to check
            // for that because we just peeked at least 2 bytes, but I'm doing it
            // anyways.
            this.log('bufReader.readFull returned null');
            this.connectionClosed();
            break;
          }
        } catch (err) {
          this.log('caught error calling bufReader.readFull');
          this.connectionClosed();
          break;
        }

        this.log('received bytes', buf);

        this.bytesReceived(buf);
      }
    }
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

    this.conn.close();
  }

  protected log(msg: string, ...args: unknown[]) {
    this.logger.debug(msg, ...args);
  }
}

export async function setupLogger(levelName: LevelName) {
  await log.setup({
    handlers: {
      mqtt: new log.handlers.ConsoleHandler(levelName, {
        formatter: (logRecord: LogRecord) => {
          let output = `${logRecord.levelName} ${logRecord.msg}`;

          const args = logRecord.args;

          if (args.length > 0) {
            for (const arg of args) {
              if (arg instanceof Uint8Array) {
                output +=
                  ' ' +
                  [...arg]
                    .map((byte) => byte.toString(16).padStart(2, '0'))
                    .join(' ');
              } else if (typeof arg === 'object') {
                output += ' ' + Deno.inspect(arg);
              }
            }
          }

          return output;
        },
      }),
    },
    loggers: {
      mqtt: {
        level: levelName,
        handlers: ['mqtt'],
      },
    },
  });

  return log.getLogger('mqtt');
}
