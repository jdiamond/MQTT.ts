import DenoClient from './client/deno.ts';

async function main() {
  const client = new DenoClient({
    keepAlive: 10
  });

  await client.connect();

  console.log('connected');

  const puback = await client.publish('test', 'test', { qos: 1 });

  console.log(puback);
}

main();
