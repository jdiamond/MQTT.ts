This package contains Node.js and browser builds of [MQTT.ts](https://github.com/jdiamond/MQTT.ts).

To build:

```
npm install
npm run build
```

For the Node.js build, Babel is used to transpile the JS so that it runs on the current LTS.

Babel and Terser are used to create both ESM and UMD builds for browsers.
