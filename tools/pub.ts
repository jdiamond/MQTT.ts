import { parse } from 'https://deno.land/std@0.70.0/flags/mod.ts';
import { Client } from '../deno/mod.ts';
import { setupLogger } from './logger.ts';

function usage() {
  console.log(`Usage: pub.ts -u mqtt://localhost -t topic/to/publish/to -m "message to publish"

Options:
 --ca            certificate authority file
 --log-level/-L  level to log (info or debug) [info]
 --message/-m    message payload
 --retain/-r     retain message [false]
 --topic/-t      topic
 --url/-u        broker url [mqtt://localhost]`);
}

async function main() {
  const args = parse(Deno.args, {
    boolean: ['help', 'retain'],
    string: ['ca', 'message', 'topic', 'url'],
    alias: {
      h: 'help',
      L: 'log-level',
      m: 'message',
      q: 'qos',
      r: 'retain',
      t: 'topic',
      u: 'url',
    },
    default: {
      help: false,
      'log-level': 'info',
      qos: 0,
      retain: false,
      url: 'mqtt://localhost',
    },
  });

  if (args.help) {
    usage();
    return Deno.exit(0);
  }

  if (!args.topic) {
    console.error('missing topic');
    return Deno.exit(1);
  }

  if (!args.message) {
    console.error('missing message');
    return Deno.exit(1);
  }

  if (args.qos && ![0, 1, 2].includes(args.qos)) {
    console.error('qos must be 0, 1, or 2');
    return Deno.exit(1);
  }

  const levelName = args['log-level'].toUpperCase();

  const logger = await setupLogger(levelName);

  const client = new Client({
    url: args.url,
    certFile: args.ca,
    logger: logger.debug.bind(logger),
  });

  await client.connect();

  logger.info(`connected to ${args.url}`);

  await client.publish(args.topic, args.message, {
    qos: args.qos,
    retain: args.retain,
  });

  if (args.qos) {
    logger.info(`publish acknowledged`);
  }

  await client.disconnect();
}

main();
