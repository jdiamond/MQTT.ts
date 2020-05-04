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
