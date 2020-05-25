import { parse } from 'https://deno.land/std@0.50.0/flags/mod.ts';
import { Client } from '../mod.ts';
import { setupLogger } from './logger.ts';

function usage() {
  console.log(`Usage: sub.ts -h localhost -p 1883 -t "topic/#" -v

Options:
 --clean          clean session (--no-clean to disable) [true]
 --client-id/-i   client id [random]
 --keep-alive/-k  keep alive in seconds [60]
 --log-level/-L   level to log (info or debug) [info];
 --qos/-q         qos [0]
 --topic/-t       topic filter (can be multiple) [#]
 --url/-u         broker url [mqtt://localhost]
 --verbose/-v     print topic before message [false]`);
}

async function main() {
  const args = parse(Deno.args, {
    boolean: ['clean', 'help', 'verbose'],
    string: ['topic', 'url'],
    alias: {
      h: 'help',
      i: 'client-id',
      k: 'keep-alive',
      L: 'log-level',
      t: 'topic',
      u: 'url',
      v: 'verbose',
    },
    default: {
      clean: true,
      help: false,
      'keep-alive': 60,
      'log-level': 'info',
      qos: 0,
      topic: '#',
      url: 'mqtt://localhost',
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
    url: args.url,
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

  logger.info(`connected to ${args.url}`);

  const topicFilters = Array.isArray(args.topic) ? args.topic : [args.topic];

  const subscriptions = await client.subscribe(topicFilters, args.qos);

  logger.info(
    `received acknowledgment for subscriptions: ${subscriptions
      .map((sub) => `"${sub.topic}" (${sub.returnCode})`)
      .join(', ')}`
  );
}

main();
