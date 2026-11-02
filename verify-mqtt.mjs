/**
 * MQTT transport test with an in-memory broker.
 * Verifies encryption, topic routing, presence, and offline marking.
 * Not part of the shipped bundle.
 */
import { EventEmitter } from 'node:events';
import { createMqttTransport, sealMessage, openMessage } from './mqtt-transport.js';

const topicMatches = (filter, topic) => {
  const left = filter.split('/');
  const right = topic.split('/');
  if (left.length !== right.length) return false;
  return left.every((segment, index) => segment === '+' || segment === right[index]);
};

class FakeBroker {
  constructor() {
    this.clients = new Set();
    this.retained = new Map();
    this.published = [];
  }

  attach(client) {
    this.clients.add(client);
  }

  detach(client) {
    this.clients.delete(client);
  }

  subscribe(client, filters) {
    for (const filter of filters) client.filters.push(filter);
    for (const [topic, payload] of this.retained) {
      if (client.filters.some((filter) => topicMatches(filter, topic))) {
        client.emit('message', topic, Buffer.from(payload));
      }
    }
  }

  publish(topic, payload, options = {}) {
    const text = Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload);
    this.published.push({ topic, text, retain: options.retain === true });
    if (options.retain === true) this.retained.set(topic, text);
    for (const client of this.clients) {
      if (client.filters.some((filter) => topicMatches(filter, topic))) {
        client.emit('message', topic, Buffer.from(text));
      }
    }
  }
}

const broker = new FakeBroker();

function createClient(url, options) {
  const emitter = new EventEmitter();
  const client = {
    filters: [],
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
    subscribe(topics, _options, callback) {
      broker.subscribe(client, [].concat(topics));
      if (callback) callback(null);
    },
    publish(topic, payload, opts, callback) {
      broker.publish(topic, payload, opts || {});
      if (typeof callback === 'function') callback(null);
    },
    end(_force, _opts, callback) {
      broker.detach(client);
      if (typeof callback === 'function') callback();
    },
  };
  broker.attach(client);
  setImmediate(() => client.emit('connect'));
  return client;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const phoneEvents = [];
const watchEvents = [];
let phoneMembers = [];
let watchMembers = [];
let phoneStatus = 'idle';

const common = {
  url: 'fake://broker',
  topic: 'interflow-test-room',
  secret: 'shared-secret',
  clientFactory: createClient,
};

const phone = createMqttTransport({
  ...common,
  nodeId: 'phone-id',
  nodeName: 'phone',
  onEvent: (event) => phoneEvents.push(event),
  onMembers: (members) => { phoneMembers = members; },
  onStatus: (status) => { phoneStatus = status; },
});
const watch = createMqttTransport({
  ...common,
  nodeId: 'watch-id',
  nodeName: 'watch',
  onEvent: (event) => watchEvents.push(event),
  onMembers: (members) => { watchMembers = members; },
});

await phone.start();
await watch.start();
await wait(50);
if (phoneStatus !== 'connected') throw new Error('phone did not connect');
if (!phoneMembers.some((member) => member.id === 'watch-id')) throw new Error('phone did not discover the watch');
if (!watchMembers.some((member) => member.id === 'phone-id')) throw new Error('watch did not discover the phone');
console.log('presence:', phoneMembers.map((member) => `${member.name}:${member.online}`).join(', '));

const direct = {
  id: 'm1',
  ts: new Date().toISOString(),
  origin: 'phone-id',
  originName: 'phone',
  to: 'watch-id',
  kind: 'note',
  subject: 'secret subject',
  body: 'the secret body must not reach the broker',
  replyTo: null,
};
await phone.publish(direct);
await wait(20);
if (!watchEvents.some((event) => event.id === 'm1')) throw new Error('watch did not receive the direct event');
if (broker.published.some((item) => item.text.includes('the secret body'))) {
  throw new Error('the broker saw plaintext message content');
}
if (!broker.published.some((item) => item.topic.endsWith('/msg/watch-id'))) {
  throw new Error('the direct event was not routed to the watch topic');
}
console.log('direct event delivered with ciphertext only');

const broadcast = { ...direct, id: 'm2', to: '*', subject: 'broadcast', body: 'everyone' };
await watch.publish(broadcast);
await wait(20);
if (!phoneEvents.some((event) => event.id === 'm2')) throw new Error('phone did not receive the broadcast');
console.log('broadcast delivered');

await watch.stop();
await wait(50);
if (!phoneMembers.some((member) => member.id === 'watch-id' && member.online === false)) {
  throw new Error('watch offline presence was not observed');
}
console.log('offline presence observed');

// Seal/open round-trip and tamper rejection.
const sealed = sealMessage('shared-secret', { hello: 'world' });
if (openMessage('shared-secret', sealed).hello !== 'world') throw new Error('seal/open round trip failed');
let tampered = false;
try {
  openMessage('wrong-secret', sealed);
} catch {
  tampered = true;
}
if (!tampered) throw new Error('a wrong secret decrypted the envelope');

await phone.stop();
console.log('mqtt test OK');
process.exit(0);
