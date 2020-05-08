import { parse } from 'https://deno.land/std/flags/mod.ts';
import DenoClient, { setupLogger } from './client/deno.ts';

function usage() {
  console.log(`Usage: sub.ts -h localhost -p 1883 -t "topic/pattern/to/subscribe/to/#" -v

Options:
 -h/--host        broker host [localhost]
 -p/--port        broker port [1883]
 -t/--topic       topic pattern to subscribe to [#]
 -v/--verbose     print topic before message [false]
 -k/--keep-alive  keep alive in seconds [60]
 -L/--log-level   level to log (info or debug) [info]`);
}

async function main() {
  const args = parse(Deno.args, {
    boolean: ['help', 'verbose'],
    alias: {
      L: 'log-level',
      h: 'host',
      p: 'port',
      t: 'topic',
      v: 'verbose',
      k: 'keep-alive',
    },
    default: {
      help: false,
      'log-level': 'info',
      host: 'localhost',
      port: 1883,
      topic: '#',
      verbose: false,
      'keep-alive': 60,
    },
  });

  if (args.help) {
    usage();
    return Deno.exit(0);
  }

  const levelName = args['log-level'].toUpperCase();

  const logger = await setupLogger(levelName);

  const client = new DenoClient({
    host: args.host,
    port: args.port,
    keepAlive: args['keep-alive'],
    logger,
  });

  const utf8Decoder = new TextDecoder('utf-8');

  client.on('message', (topic: string, message: Uint8Array) => {
    const prefix = args.verbose ? topic + ' ' : '';
    console.log(prefix + utf8Decoder.decode(message));
  });

  await client.connect();

  logger.info(`connected to ${args.host}:${args.port}`);

  const suback = await client.subscribe(args.topic);

  if (suback) {
    logger.info(`received suback for topic ${null}`);
  }
}

main();
