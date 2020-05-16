import { parse } from 'https://deno.land/std@0.50.0/flags/mod.ts';
import { Client } from '../mod.ts';
import { setupLogger } from './logger.ts';

function usage() {
  console.log(`Usage: sub.ts -h localhost -p 1883 -t "topic/#" -v

Options:
 --clean          clean session (--no-clean to disable) [true]
 --client-id/-i   client id [random]
 --host/-h        broker host [localhost]
 --port/-p        broker port [1883]
 --keep-alive/-k  keep alive in seconds [60]
 --log-level/-L   level to log (info or debug) [info];
 --qos/-q         qos [0]
 --topic/-t       topic filter (can be multiple) [#]
 --verbose/-v     print topic before message [false]`);
}

async function main() {
  const args = parse(Deno.args, {
    boolean: ['clean', 'help', 'verbose'],
    string: ['host', 'topic'],
    alias: {
      h: 'host',
      i: 'client-id',
      k: 'keep-alive',
      L: 'log-level',
      p: 'port',
      t: 'topic',
      v: 'verbose',
    },
    default: {
      clean: true,
      help: false,
      host: 'localhost',
      'keep-alive': 60,
      'log-level': 'info',
      port: 1883,
      qos: 0,
      topic: '#',
      verbose: false,
    },
  });

  if (args.help) {
    usage();
    return Deno.exit(0);
  }

  const levelName = args['log-level'].toUpperCase();

  const logger = await setupLogger(levelName);

  const client = new Client({
    host: args.host,
    port: args.port,
    clientId: args['client-id'],
    clean: args.clean,
    keepAlive: args['keep-alive'],
    logger: logger.debug.bind(logger),
  });

  const utf8Decoder = new TextDecoder('utf-8');

  client.on('message', (topic: string, message: Uint8Array) => {
    const prefix = args.verbose ? topic + ' ' : '';
    console.log(prefix + utf8Decoder.decode(message));
  });

  await client.connect();

  logger.info(`connected to ${args.host}:${args.port}`);

  const suback = await client.subscribe(args.topic, args.qos);

  if (suback) {
    logger.info(`received suback for topic ${args.topic}`);
  }
}

main();
