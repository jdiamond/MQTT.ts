import { parse } from 'https://deno.land/std/flags/mod.ts';
import DenoClient, { setupLogger } from './client/deno.ts';

async function main() {
  const args = parse(Deno.args, {
    alias: { L: 'log-level' },
  });

  const levelName = (args['log-level'] || 'INFO').toUpperCase();

  const logger = await setupLogger(levelName);

  const client = new DenoClient({
    keepAlive: 10,
    logger,
  });

  await client.connect();

  console.log('connected');

  const puback = await client.publish('test', 'test', { qos: 1 });

  console.log(puback);
}

main();
