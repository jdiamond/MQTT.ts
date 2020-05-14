#!/usr/bin/env node

const { Client } = require('../../build/index.js');

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
