// import { Client } from 'https://unpkg.com/@jdiamond/mqtt';
import { Client } from './browser.mjs';

window.mqtt = {
  connect(url) {
    const client = new Client({ url, logger: console.log });

    client.connect();

    const decoder = new TextDecoder('utf-8');

    client.on('message', (topic, payload) => {
      window.dispatchEvent(
        new CustomEvent('messagereceived', {
          detail: {
            topic,
            payload: decoder.decode(payload),
          },
        })
      );
    });

    return client;
  },
};
