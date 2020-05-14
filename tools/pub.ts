import { parse } from 'https://deno.land/std@0.50.0/flags/mod.ts';
import { Client } from '../mod.ts';
import { setupLogger } from './logger.ts';

function usage() {
  console.log(`Usage: pub.ts -h localhost -p 1883 -t topic/to/publish/to -m "message to publish"

Options:
 -h/--host       broker host [localhost]
 -p/--port       broker port [1883]
 -t/--topic      topic
 -m/--message    message payload
 -L/--log-level  level to log (info or debug) [info]`);
}

async function main() {
  const args = parse(Deno.args, {
    boolean: ['help', 'retain'],
    alias: {
      L: 'log-level',
      h: 'host',
      p: 'port',
      t: 'topic',
      m: 'message',
      q: 'qos',
      r: 'retain',
    },
    default: {
      help: false,
      'log-level': 'info',
      host: 'localhost',
      port: 1883,
      qos: 0,
      retain: false,
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
    host: args.host,
    port: args.port,
    logger: logger.debug.bind(logger),
  });

  await client.connect();

  logger.info(`connected to ${args.host}:${args.port}`);

  const puback = await client.publish(args.topic, args.message, {
    qos: args.qos,
    retain: args.retain,
  });

  if (puback) {
    logger.info(`received puback for message id ${puback.id}`);
  }

  await client.disconnect();
}

main();
