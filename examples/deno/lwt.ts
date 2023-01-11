#!/usr/bin/env deno run --allow-net

import { Client } from '../../deno/mod.ts';

async function main() {
  const client1 = new Client({
    url: 'mqtt://localhost:1883',
  });

  await client1.connect();
  console.log("Client 1 Connected")

  await client1.subscribe('lwt')

  client1.on('message', (topic: string, payload: Uint8Array) => {
    console.log('Recieved:', topic, new TextDecoder().decode(payload))
    
    client1.disconnect().then(() => void Deno.exit(0))
  })


  const client2 = new Client({
    url: 'mqtt://localhost:1883',
    will: {
      qos: 1,
      retain: true,
      topic: 'lwt',
      payload: 'Client2 has crashed',
    }
  })

  await client2.connect()
  console.log("Client 2 Connected")

  //@ts-expect-error Accessing Private variable to 'crash' client 2
  client2.conn?.close()
}

main();
