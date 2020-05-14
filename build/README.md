This folder contains a package.json with the dependencies and scripts needed to make Node.js and browser builds of MQTT.ts.

```
npm install
npm run build
```

For the Node.js build, Babel is used to transpile the JS so that it runs on the current LTS.

Babel and Terser are used to create browser both ESM and UMD builds for browsers. You should really customize 