import { Client } from '@jdiamond/mqtt-browser';

let client = null;

const textDecoder = new TextDecoder();

const urlInput = document.getElementById('urlInput');
const topicFilterInput = document.getElementById('topicFilterInput');
const topicInput = document.getElementById('topicInput');
const payloadInput = document.getElementById('payloadInput');
const qosInput = document.getElementById('qosInput');

const connectOutput = document.getElementById('connectOutput');
const subscribeOutput = document.getElementById('subscribeOutput');
const publishOutput = document.getElementById('publishOutput');
const messagesOutput = document.getElementById('messagesOutput');

const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const subscribeButton = document.getElementById('subscribeButton');
const unsubscribeButton = document.getElementById('unsubscribeButton');
const publishButton = document.getElementById('publishButton');

async function connect() {
  const url = urlInput.value;

  client = new Client({ url });

  client.on('message', receiveMessage);

  connectOutput.textContent = 'Connecting';

  const response = await client.connect();

  connectOutput.textContent = JSON.stringify(response);
}

async function disconnect() {
  connectOutput.textContent = 'Disconnecting';

  await client.disconnect();

  connectOutput.textContent = 'Not Connected';
}

async function subscribe() {
  const response = await client.subscribe(topicFilterInput.value);

  subscribeOutput.textContent = JSON.stringify(response);
}

async function unsubscribe() {
  const response = await client.unsubscribe(topicFilterInput.value);

  subscribeOutput.textContent = JSON.stringify(response);
}

async function publish() {
  const response = await client.publish(topicInput.value, payloadInput.value, {
    qos: qosInput.valueAsNumber,
  });

  console.log(response);

  publishOutput.textContent = JSON.stringify(response);
}

function receiveMessage(topic, payload) {
  console.log(topic, payload);

  const decodedPayload = textDecoder.decode(payload);

  const tr = messagesOutput.insertRow();

  tr.insertCell().textContent = topic;
  tr.insertCell().textContent = decodedPayload;
}

connectButton.addEventListener('click', connect);
disconnectButton.addEventListener('click', disconnect);
subscribeButton.addEventListener('click', subscribe);
unsubscribeButton.addEventListener('click', unsubscribe);
publishButton.addEventListener('click', publish);
