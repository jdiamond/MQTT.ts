# MQTT.ts

This is an implementation of the MQTT 3.1.1 protocol written in TypeScript.

It is _not_ a port of the excellent [MQTT.js](https://github.com/mqttjs/MQTT.js) package. I wrote it for "fun", originally using [Flow](https://flow.org/), but never finished and then forgot about it. When I saw there were no MQTT modules for Deno, I decided to convert it to TypeScript as an exercise in learning [Deno](https://deno.land/).

Since the core of the library has no dependencies, it wasn't too difficult to add support for Node.js and browsers so why not?

## Quick Start

```
import { Client } from 'https://deno.land/x/mqtt/deno/mod.ts'; // Deno (ESM)
// const { Client } = require('@jdiamond/mqtt'); // Node.js (CommonJS)
// import { Client } from 'https://unpkg.com/@jdiamond/mqtt-browser'; // Browsers (ESM)

const client = new Client({ url: 'mqtt://test.mosquitto.org' }); // Deno and Node.js
// const client = new Client({ url: 'ws://test.mosquitto.org:8081' }); // Browsers

await client.connect();

await client.subscribe('incoming/#');

client.on('message', (topic, payload) => {
  console.log(topic, payload);
});

await client.publish('my/topic', 'my payload');

await client.disconnect();
```

See the [API documentation](docs/api.md) for more details.

## Deno

The "raw" TypeScript files are import'able by Deno.

The Deno `Client` uses `Deno.connect` to create TCP connections so `--allow-net` is required when running code using this module.

Look in [examples/deno](examples/deno) to see examples of using the client.

There are some CLI tools in [tools](tools) that are similar to mosquitto_pub and mosquitto_sub.

To subscribe:

```
deno run --allow-net tools/sub.ts -u mqtt://test.mosquitto.org -t "MQTT.ts/test/topic" -v
```

To publish:

```
deno run --allow-net tools/pub.ts -u mqtt://test.mosquitto.org -t "MQTT.ts/test/topic" -m "hello"
```

## Node.js

The Node.js `Client` uses the `net` module to create TCP connections.

This build is published to npm as [@jdiamond/mqtt](https://www.npmjs.com/package/@jdiamond/mqtt) and can be imported like any normal npm package.

Examples in [examples/node](examples/node).

## Browsers

The browser `Client` uses a `WebSocket` object to connect to a broker that supports MQTT over WebSockets.

This build is published to npm as [@jdiamond/mqtt-browser](https://www.npmjs.com/package/@jdiamond/mqtt-browser) and available via unpkg.com here:

https://unpkg.com/@jdiamond/mqtt-browser

The UMD build for older browsers is available here:

https://unpkg.com/browse/@jdiamond/mqtt-browser/index.min.js

Example in [examples/browser](examples/browser).

## Development

First started working with Deno 1.0.0, but I only test with recent versions (most recently 1.4.1). Maybe I should set up some GitHub actions?

To run the unit tests:

```
deno test client packets
```

To test publishing and subscribing to a local broker, run these commands in separate shells:

```
/usr/local/sbin/mosquitto -c mosquitto.conf
deno run --allow-net tools/sub.ts -t "foo/#" -v
deno run --allow-net tools/pub.ts -t "foo/bar" -m "baz"
```

Protocol Links:

- 5.0: https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html
- 3.1.1: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html
- 3.1: https://public.dhe.ibm.com/software/dw/webservices/ws-mqtt/mqtt-v3r1.html

## Roadmap to 1.0

- finish API docs
- protocol version 3.1
- mqtts for deno and node clients
- use native event target/emitter classes
- events for messages matching topic filters
- async iterators for messages matching topic filters
- make disconnect wait until all publishes sent/acknowledged
- address all TODO comments in code
- release process
  - tag for deno.land/x to use
  - publish Node.js and browser builds to npm
    - keep in sync or allow versions to drift?

## Post 1.0

- protocol version 5.0
- round robin connect to multiple brokers
- benchmarking and performance improvements
- MQTT over QUIC
- base class for server applications?
