/**
 * End-to-end MQTT engine test against a real public broker.
 * Two engines, one random room, no HTTP listener.
 * Requires internet and the installed mqtt package. Not part of the bundle.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { apply } from './index.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'interflow-mqtt-'));
const room = `interflow-test-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
const secret = `secret-${Math.random().toString(16).slice(2)}`;
const url = process.env.IFX_MQTT_URL || 'wss://broker.emqx.io:8084/mqtt';
const cleanups = [];

function boot(name, config, extras = {}) {
  const tools = new Map();
  const disposers = [];
  const ctx = {
    effect(fn) {
      const dispose = fn();
      disposers.push(dispose);
      return dispose;
    },
    inject() {},
    get(service) {
      return extras[service];
    },
    tools: {
      register(definition) {
        tools.set(definition.name, definition);
        return () => {};
      },
    },
  };
  apply(ctx, config);
  const stop = async () => {
    for (const dispose of disposers.reverse()) {
      if (typeof dispose === 'function') await dispose();
    }
  };
  cleanups.push(stop);
  return { name, tools, stop };
}

function fakeSessionController(answerText) {
  const state = { prompt: null, waiters: [] };
  return {
    state,
    async create() {
      return { sessionId: `session-${Math.random().toString(16).slice(2)}` };
    },
    async prompt(request) {
      state.prompt = request;
      for (const wake of state.waiters.splice(0)) wake();
      return { accepted: true };
    },
    cancel() {},
    follow(_request, signal) {
      return (async function* stream() {
        if (!state.prompt) await new Promise((resolve) => state.waiters.push(resolve));
        if (signal && signal.aborted) throw new Error('aborted');
        yield {
          type: 'event',
          event: {
            type: 'assistant/message',
            seq: 1,
            time: Date.now(),
            data: {
              turn: 1,
              step: 1,
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: answerText }],
                source: { kind: 'model', provider: 'fake', model: 'fake' },
              },
            },
          },
        };
        yield {
          type: 'event',
          event: { type: 'turn/end', seq: 2, time: Date.now(), data: { turn: 1, reason: { kind: 'completed' } } },
        };
      })();
    },
  };
}

const call = async (node, tool, args) => {
  const definition = node.tools.get(tool);
  if (!definition) throw new Error(`${node.name}: missing tool ${tool}`);
  return definition.execute(args || {}, {});
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const phone = boot('phone', {
  transport: 'mqtt',
  nodeName: 'phone',
  mqttUrl: url,
  mqttTopic: room,
  token: secret,
  dataDir: path.join(root, 'phone'),
});
const watchSession = fakeSessionController('The watch is at 31.23, 121.47 over MQTT.');
const watch = boot('watch', {
  transport: 'mqtt',
  nodeName: 'watch',
  mqttUrl: url,
  mqttTopic: room,
  token: secret,
  executeRequests: true,
  dataDir: path.join(root, 'watch'),
}, { sessionController: watchSession });

await wait(3500);

const phonePeers = await call(phone, 'interflow_peers');
console.log('phone peers:', JSON.stringify(phonePeers.peers));
if (phonePeers.self.transport !== 'mqtt') throw new Error('phone is not in MQTT mode');
if (!phonePeers.peers.some((peer) => peer.label === 'watch')) {
  throw new Error('phone did not discover the watch over MQTT presence');
}

await call(phone, 'interflow_send', { to: 'watch', subject: 'mqtt-e2e', body: 'hello over the real broker' });
await wait(1800);

const inbox = await call(watch, 'interflow_inbox', { markRead: false });
const received = (inbox.messages || []).find((message) => message.subject === 'mqtt-e2e');
if (!received) throw new Error('the watch did not receive the MQTT message');
console.log('watch received:', received.body);

await call(watch, 'interflow_send', { to: phonePeers.self.id, subject: 'mqtt-reply', body: 'reply over mqtt' });
await wait(1800);
const phoneInbox = await call(phone, 'interflow_inbox', { markRead: false });
if (!(phoneInbox.messages || []).some((message) => message.subject === 'mqtt-reply')) {
  throw new Error('the phone did not receive the MQTT reply');
}
console.log('phone received reply');

// Remote request over the same MQTT room.
const request = await call(phone, 'interflow_request', {
  to: 'watch',
  subject: 'Where am I over MQTT?',
  body: 'Report the current location.',
});
await wait(2200);
const phoneRequests = await call(phone, 'interflow_inbox', { markRead: false });
const requestAnswer = (phoneRequests.messages || []).find((message) => message.kind === 'answer' && message.replyTo === request.id);
if (!requestAnswer) throw new Error('the MQTT request was not answered');
if (!requestAnswer.body.includes('31.23')) throw new Error('the MQTT answer lost its body');
console.log('remote request answered over MQTT:', requestAnswer.body);

for (const dispose of cleanups.reverse()) await dispose();
await fs.rm(root, { recursive: true, force: true });
console.log('mqtt engine test OK');
process.exit(0);
