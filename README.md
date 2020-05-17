# MQTT.ts

This is an implementation of the MQTT 3.1.1 protocol for [Deno](https://deno.land/).

It is _not_ a port of the excellent [MQTT.js](https://github.com/mqttjs/MQTT.js) package. I wrote it for "fun", originally using [Flow](https://flow.org/), but never finished and then forgot about it. When I saw there were no MQTT modules for Deno, I decided to convert it to TypeScript as an exercise in learning Deno.

Since the core of the library has no dependencies, it wasn't too difficult to add support for Node.js and browsers so why not?

## Deno

The "raw" TypeScript files are import'able by Deno.

The Deno `Client` uses `Deno.connect` to create TCP connections so `--allow-net` is required when running code using this module.

Look in [examples/deno](examples/deno) to see examples of using the client.

## Node.js

The Node.js `Client` uses the `net` module to create TCP connections.

This build is published to npm as [@jdiamond/mqtt](https://www.npmjs.com/package/@jdiamond/mqtt) and can be imported like any normal npm package.

Examples in [examples/node](examples/node).

## Browsers

The browser `Client` uses a `WebSocket` object to connect to a broker that supports MQTT over WebSockets.

This build is published to npm as [@jdiamond/mqtt](https://www.npmjs.com/package/@jdiamond/mqtt) and available via unpkg.com here:

https://unpkg.com/@jdiamond/mqtt

The UMD build for older browsers is available here:

https://unpkg.com/browse/@jdiamond/mqtt/browser.min.js

Example in [examples/browser](examples/browser).

## Development

Requires Deno 1.0.0.

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

## TODO

- quick start examples
- api docs
- also support 3.1 and 5.0
- async iterators for messages matching topic patterns
- address all TODO comments in code
- types for node.js and browser builds
- benchmarking and performance improvements
- round robin connect to multiple brokers
- mqtts for deno and node clients
- use native event target/emitter classes
