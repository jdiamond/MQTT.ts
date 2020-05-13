#!/usr/bin/env deno run --allow-net

import { Client } from '../../mod.ts';

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 1883,
  });

  await client.connect();

  const decoder = new TextDecoder();

  client.on('message', (topic: string, payload: Uint8Array) => {
    console.log(topic, decoder.decode(payload));
  });

  await client.subscribe('#');
}

main();
