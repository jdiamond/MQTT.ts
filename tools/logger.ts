import * as log from 'https://deno.land/std@0.50.0/log/mod.ts';
import { LogRecord } from 'https://deno.land/std@0.50.0/log/logger.ts';
import { LevelName } from 'https://deno.land/std@0.50.0/log/levels.ts';

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
