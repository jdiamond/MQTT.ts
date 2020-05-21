import { Client } from '@jdiamond/mqtt';

async function main() {
  const client = new Client({
    url: 'mqtt://localhost',
  });

  await client.connect();

  await client.publish('topic', 'payload');

  await client.disconnect();
}

main();
