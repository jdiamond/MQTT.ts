#!/usr/bin/env deno run --allow-net

import { Client } from '../../mod.ts';

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 1883,
  });

  await client.connect();

  await client.publish('topic', 'payload');

  await client.disconnect();
}

main();
