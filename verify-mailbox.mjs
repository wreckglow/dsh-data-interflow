/**
 * Mailbox topology test: one hub and two outbound-only spokes.
 * Exercises the real HTTP endpoints in one process.
 * Not part of the shipped bundle.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { apply } from './index.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'interflow-mailbox-'));
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

/**
 * Minimal session controller: creates a session, waits for the prompt, then
 * emits one assistant answer and a completed turn.
 */
function fakeSessionController(answerText) {
  const state = { prompt: null, cancelled: false, waiters: [] };
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
    cancel() {
      state.cancelled = true;
    },
    follow(_request, signal) {
      return (async function* stream() {
        if (!state.prompt) {
          await new Promise((resolve) => state.waiters.push(resolve));
        }
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
  const value = await definition.execute(args || {}, {});
  return value;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const messageCount = (result) => (Array.isArray(result.messages) ? result.messages.length : 0);
const hasSubject = (result, subject) => (result.messages || []).some((message) => message.subject === subject);

const hub = boot('hub', {
  role: 'hub',
  nodeName: 'hub',
  listenHost: '127.0.0.1',
  listenPort: 47980,
  token: 'mesh-secret',
  pollMs: 500,
  presenceWindowMs: 1500,
  dataDir: path.join(root, 'hub'),
});

const phone = boot('phone', {
  role: 'spoke',
  nodeName: 'phone',
  hubUrl: 'http://127.0.0.1:47980',
  token: 'mesh-secret',
  pollMs: 500,
  dataDir: path.join(root, 'phone'),
});

const watchConfig = {
  role: 'spoke',
  nodeName: 'watch',
  hubUrl: 'http://127.0.0.1:47980',
  token: 'mesh-secret',
  pollMs: 500,
  executeRequests: true,
  dataDir: path.join(root, 'watch'),
};
const watchSession = fakeSessionController('The watch is at 31.23, 121.47.');
const watch = boot('watch', watchConfig, { sessionController: watchSession });

await wait(1800);

const phoneSelf = (await call(phone, 'interflow_peers')).self;
const watchSelf = (await call(watch, 'interflow_peers')).self;
console.log('phone role:', phoneSelf.role, 'watch role:', watchSelf.role);

const phonePeers = await call(phone, 'interflow_peers');
console.log('phone devices:', phonePeers.peers.map((peer) => `${peer.kind}:${peer.label}`).join(', '));
if (!phonePeers.peers.some((peer) => peer.kind === 'hub')) throw new Error('phone does not see its hub');
if (!phonePeers.peers.some((peer) => peer.kind === 'member' && peer.label === 'watch')) {
  throw new Error('phone does not see the watch member');
}

// Broadcast from the phone reaches the watch without phone-watch connectivity.
await call(phone, 'interflow_send', { to: '*', subject: 'broadcast-1', body: 'hello mesh' });
await wait(1200);
const watchInbox = await call(watch, 'interflow_inbox', { markRead: false });
if (!hasSubject(watchInbox, 'broadcast-1')) throw new Error('watch did not receive the broadcast');
console.log('watch received broadcast:', hasSubject(watchInbox, 'broadcast-1'));

// Directed reply from the watch reaches the phone through the mailbox.
await call(watch, 'interflow_send', { to: phoneSelf.id, subject: 'reply-1', body: 'from the watch' });
await wait(1200);
const phoneInbox = await call(phone, 'interflow_inbox', { markRead: false });
if (!hasSubject(phoneInbox, 'reply-1')) throw new Error('phone did not receive the watch reply');
console.log('phone received reply:', hasSubject(phoneInbox, 'reply-1'));

// A remote request runs on the target and answers with a correlated message.
const request = await call(phone, 'interflow_request', {
  to: 'watch',
  subject: 'Where am I?',
  body: 'Use your local tools to report the current location.',
});
if (!request.ok || !request.id) throw new Error('request was not accepted');
await wait(1800);
if (!watchSession.state.prompt) throw new Error('the watch never received a session prompt');
const promptText = watchSession.state.prompt.content.map((part) => part.text || '').join('\n');
if (!promptText.includes('Where am I?')) throw new Error('the prompt lost the request subject');
const answerInbox = await call(phone, 'interflow_inbox', { markRead: false });
const answer = (answerInbox.messages || []).find((message) => message.kind === 'answer' && message.replyTo === request.id);
if (!answer) throw new Error('the phone never received the request answer');
if (!answer.body.includes('31.23')) throw new Error('the answer body was not returned');
console.log('remote request answered:', answer.body);

// Execution disabled is answered explicitly instead of leaving the request pending.
const declined = await call(phone, 'interflow_request', {
  to: 'hub',
  subject: 'Decline check',
  body: 'This mailbox does not execute requests.',
});
await wait(1400);
const declinedInbox = await call(phone, 'interflow_inbox', { markRead: false });
const declinedAnswer = (declinedInbox.messages || []).find((message) => message.kind === 'answer' && message.replyTo === declined.id);
if (!declinedAnswer) throw new Error('the disabled hub did not answer the request');
if (!/disabled/i.test(declinedAnswer.body)) throw new Error('the disabled reply did not explain itself');
console.log('disabled execution answered:', declinedAnswer.body);

// The hub must not treat a message addressed to the watch as its own unread mail.
const hubInbox = await call(hub, 'interflow_inbox', { markRead: false });
if (hasSubject(hubInbox, 'reply-1')) throw new Error('hub inbox leaked a member-directed message');
console.log('hub inbox correctly excludes member-directed mail');

// The watch goes offline; the phone sends a directed message; it must wait in the mailbox.
await watch.stop();
await wait(300);
await call(phone, 'interflow_send', { to: watchSelf.id, subject: 'queued-1', body: 'sent while offline' });
await wait(2000);
const offlinePeers = await call(phone, 'interflow_peers');
const watchRow = offlinePeers.peers.find((peer) => peer.nodeId === watchSelf.id);
console.log('watch reported offline:', watchRow ? watchRow.online === false : 'missing');
if (watchRow && watchRow.online === true) throw new Error('watch should be offline');

const watchAgain = boot('watch', watchConfig);
await wait(1800);
const queuedInbox = await call(watchAgain, 'interflow_inbox', { markRead: false });
if (!hasSubject(queuedInbox, 'queued-1')) throw new Error('watch did not receive the queued message after reconnect');
console.log('watch received queued message after reconnect:', hasSubject(queuedInbox, 'queued-1'));

const finalHubPeers = await call(hub, 'interflow_peers');
console.log('hub devices:', finalHubPeers.peers.map((peer) => `${peer.label}:${peer.online ? 'on' : 'off'}`).join(', '));

for (const dispose of cleanups.reverse()) await dispose();
await fs.rm(root, { recursive: true, force: true });
console.log('mailbox test OK');
process.exit(0);
