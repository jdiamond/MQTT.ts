# MQTT.ts

This is an implementation of the MQTT 3.1.1 protocol for [Deno](https://deno.land/).

It is _not_ a port of the excellent [MQTT.js](https://github.com/mqttjs/MQTT.js) package. I wrote it for "fun", originally using [Flow](https://flow.org/), but never finished and then forgot about it. When I saw there was no MQTT modules for Deno, I decided to convert it to TypeScript as an excuse to learn Deno.

This is not complete, but it can connect, publish, and subscribe.

Last tested with deno 0.42.0.

To run the unit tests:

```
deno test
```

To test publishing and subscribing to a local broker, run these commands in separate shells:

```
/usr/local/sbin/mosquitto
deno run --allow-net sub.ts -t "foo/#" -v
deno run --allow-net pub.ts -t "foo/bar" -m "baz"
```

Protocol: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html

TODO:

- finish encoders, decoders, and tests for all packet types
- unit tests for abstract client
- retry logic for unacknowledged publishes
- async iterators for messages matching topic patterns
- api docs
- node client
- browser client
