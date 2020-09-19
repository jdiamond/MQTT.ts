# MQTT.ts API

## Imports

MQTT.ts works in Deno, Node.js, and browsers. The imports for each platform are slightly different.

### Deno Imports

The Deno build is accessible via this URL (cannot be used in Node.js or browsers).

```
import { Client } from 'https://deno.land/x/mqtt/deno/mod.ts';
```

### Node.js Imports

Install the package with npm:

```
npm install @jdiamond/mqtt
```

Now you can use `require` to load the package:

```
const { Client } = require('@jdiamond/mqtt');
```

### Browser Imports

A browser build is published in a separate npm package and accessible via unpkg.com:

```
import { Client } from 'https://unpkg.com/@jdiamond/mqtt-browser';
```

## Client class

The `Client` class is the primary API. Each platform has its own implementation. Their APIs are identical with the important exception that the URL protocols supported by each platform are different.

The most notable difference is Deno and Node.js clients support `mqtt:` and `mqtts:` URLs, but browser clients only support `ws:` and `wss:` URLs.

### Client example

This example requires `Client` to have been imported as above.

```
async function connectAndPublish() {
  const client = new Client({ url: 'mqtt://test.mosquitto.org' });
  // or, in browsers:
  // const client = new Client({ url: 'ws://test.mosquitto.org:8080' });

  await client.connect();
  await client.publish('my/topic', 'my payload');
  await client.disconnect();
}
```

In that example, `connect()`, `publish()`, and `disconnect()` are called with the `await` keyword but it's usually OK to omit that if you just want to fire and forget. Connections are retried until they succeed and won't reject unless retries are explicitly disabled. Publishes are queued in memory when the client is offline and calling disconnect only sets a flag to defer disconnecting until all queued packets have been flushed.

### Client constructor

### Client connect method

### Client publish method

### Client subscribe method

### Client unsubscribe method

### Client disconnect method

### Client message event
