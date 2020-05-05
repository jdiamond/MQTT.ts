# MQTT.ts

This is an implementation of the MQTT 3.1.1 protocol for [Deno](https://deno.land/).

It is _not_ a port of the excellent [MQTT.js](https://github.com/mqttjs/MQTT.js) package. I wrote it for "fun", originally using [Flow](https://flow.org/), but never finished and then forgot about it. When I saw there was no MQTT modules for Deno, I decided to convert it to TypeScript as an excuse to learn Deno.

This is not complete, but it can connect, publish, and subscribe.

Last tested with deno 0.42.0.

To run the unit tests:

```
deno test client packets
```

To test publishing and subscribing to a local broker, run these commands in separate shells:

```
/usr/local/sbin/mosquitto -c mosquitto.conf
deno run --allow-net sub.ts -t "foo/#" -v
deno run --allow-net pub.ts -t "foo/bar" -m "baz"
```

Protocol: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html

## Deno

The "raw" TypeScript files are import'able by Deno.

Look in pub.ts to see an example of using the client.

## Node.js

A Node.js build can be made like this:

```
deno bundle client/node.ts > node.mjs
npx rollup node.mjs --file node.cjs --format cjs
```

Look in node-pub.js to see an example of using it.

## Browser

A browser build can be made like this:

```
deno bundle client/browser.ts > browser.js
npx terser -o browser.min.js browser.js
```

Look in index.html to see an example of using it.

## TODO

- finish encoders, decoders, and tests for all packet types
- unit tests for abstract client
- retry logic for unacknowledged publishes
- async iterators for messages matching topic patterns
- api docs
- npm package
