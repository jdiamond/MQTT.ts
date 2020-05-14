#!/usr/bin/env node

const { Client } = require('../../build/index.js');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 1883,
  });

  await client.connect();

  client.on('message', (topic, payload) => {
    console.log(topic, payload.toString('utf-8'));
  });

  await client.subscribe('#');
}

main();
