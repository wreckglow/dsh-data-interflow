/**
 * Local harness: exercise the host half without a running DSH.
 * Not part of the shipped bundle.
 */
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { apply } from './index.js';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'interflow-test-'));
const cleanups = [];
const tools = new Map();
const rpcHandlers = new Map();
const fetchRoutes = new Map();
let peerLogSince = 0;
const received = [];
const sentByPeer = [];

const fakePeer = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/log') {
    const since = Number(url.searchParams.get('since') || 0);
    const events = since < 1
      ? [{ seq: 1, event: { id: 'peer-message-1', ts: new Date().toISOString(), origin: 'peer-node', originName: 'Fake Peer', to: '*', kind: 'alert', subject: 'Hello from peer', body: 'peer body', replyTo: null } }]
      : [];
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, node: { id: 'peer-node', name: 'Fake Peer' }, firstSeq: 1, lastSeq: 1, reset: false, events }));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/ingest') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}');
      for (const event of parsed.events || []) received.push(event);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, accepted: (parsed.events || []).length, lastSeq: 9 }));
    });
    return;
  }
  res.writeHead(404);
  res.end('no');
});

await new Promise((resolve) => fakePeer.listen(47991, '127.0.0.1', resolve));

const connection = {
  rpc: {
    handle(channel, handler) {
      rpcHandlers.set(channel, handler);
      return () => {};
    },
  },
  fetch: {
    register(route) {
      fetchRoutes.set(route.path, route);
      return () => { fetchRoutes.delete(route.path); };
    },
  },
};

const ctx = {
  connection,
  effect(fn) {
    const dispose = fn();
    if (typeof dispose === 'function') cleanups.push(dispose);
    return dispose;
  },
  inject(names, callback) {
    if (names.includes('connection')) {
      callback({
        effect(fn) {
          const dispose = fn();
          cleanups.push(dispose);
          return dispose;
        },
        connection,
      });
    }
  },
  tools: {
    register(definition) {
      tools.set(definition.name, definition);
      return () => {};
    },
  },
};

apply(ctx, {
  dataDir: tmp,
  listenHost: '127.0.0.1',
  listenPort: 47990,
  pollMs: 500,
  executeRequests: true,
  peers: [],
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await wait(400);

const call = async (name, args) => {
  const tool = tools.get(name);
  if (!tool) throw new Error(`missing tool ${name}`);
  return tool.execute(args || {}, {});
};

console.log('tools:', [...tools.keys()].join(', '));
console.log('peer report:', JSON.stringify(await call('interflow_peers')));

const connect = await call('interflow_connect', { url: 'http://127.0.0.1:47991', label: 'fake' });
console.log('connect:', JSON.stringify(connect));
await wait(700);
console.log('peers after connect:', JSON.stringify(await call('interflow_peers')));

const sent = await call('interflow_send', { to: 'fake', subject: 'hi', body: 'hello there', kind: 'note' });
console.log('send:', JSON.stringify(sent));
await wait(400);
console.log('fake received:', received.length, JSON.stringify(received[0] && received[0].subject));

const inbox = await call('interflow_inbox', { markRead: false });
console.log('inbox:', JSON.stringify(inbox));

const panelRoute = fetchRoutes.get('/api/interflow');
const callPanel = async (op, payload) => {
  const response = await panelRoute.fetch(new Request('http://local/api/interflow', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ op, payload: payload || {} }),
  }));
  return response.json();
};
console.log('panel route registered:', panelRoute !== undefined);
console.log('panel snapshot ok:', (await callPanel('snapshot', {})).ok);
await callPanel('configureTransport', { transport: 'http', requireApproval: true });
const approvalSelf = await call('interflow_peers');
await fetch('http://127.0.0.1:47990/ingest', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    events: [{
      id: 'approval-request-1',
      ts: new Date().toISOString(),
      origin: 'peer-node',
      originName: 'Fake Peer',
      to: approvalSelf.self.id,
      kind: 'request',
      subject: 'approval test',
      body: 'run this',
      replyTo: null,
    }],
  }),
});
await wait(300);
const pending = await callPanel('snapshot', {});
console.log('approval pending:', pending.value.approvals && pending.value.approvals.length);
const approved = await callPanel('approve', { id: 'approval-request-1' });
console.log('approval approve:', approved.ok, approved.value && approved.value.approved);
await wait(300);
const afterApproval = await callPanel('snapshot', {});
console.log('approval cleared:', afterApproval.value.approvals && afterApproval.value.approvals.length);
const panelPeers = await callPanel('addPeer', { url: 'http://127.0.0.1:47991', label: 'panel-fake' });
console.log('panel addPeer ok:', panelPeers.ok, 'added:', panelPeers.value && panelPeers.value.added);
const panelSend = await callPanel('send', { to: 'panel-fake', subject: 'panel', body: 'from panel route' });
console.log('panel send ok:', panelSend.ok, 'id:', panelSend.value && panelSend.value.id);

const multi = await call('interflow_run', { targets: ['peer-node'], subject: 'multi', body: 'do it' });
console.log('multi task:', multi.ok, multi.task && multi.task.status, multi.task && multi.task.targets.length);
const selfInfo = await call('interflow_peers');
const requestId = multi.task && multi.task.targets[0] && multi.task.targets[0].requestId;
if (requestId) {
  await fetch('http://127.0.0.1:47990/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      events: [{
        id: 'task-answer-1',
        ts: new Date().toISOString(),
        origin: 'peer-node',
        originName: 'Fake Peer',
        to: selfInfo.self.id,
        kind: 'answer',
        subject: 'Re: multi',
        body: 'done',
        replyTo: requestId,
      }],
    }),
  });
  await wait(300);
}
const listed = await call('interflow_tasks', {});
console.log('multi task answer:', listed.ok, listed.tasks && listed.tasks[0] && listed.tasks[0].status, listed.tasks && listed.tasks[0] && listed.tasks[0].targets[0].status);
console.log('multi tasks listed:', listed.ok, listed.tasks && listed.tasks.length);

const cancellable = await call('interflow_run', { targets: ['peer-node'], subject: 'cancel me', body: 'wait' });
const cancelled = await call('interflow_cancel', { taskId: cancellable.task.id });
console.log('cancel task:', cancelled.ok, cancelled.task && cancelled.task.status, cancelled.task && cancelled.task.targets[0].status);
const retried = await call('interflow_retry', { taskId: cancellable.task.id });
console.log('retry task:', retried.ok, retried.task && retried.task.targets[0].status);

console.log('panel remove ok:', (await callPanel('removePeer', { url: 'http://127.0.0.1:47991' })).ok);

const switched = await callPanel('configureTransport', { transport: 'http' });
console.log('panel transport switch:', switched.ok, switched.value && switched.value.transport);
const afterSwitch = await call('interflow_peers');
console.log('listening after transport switch:', afterSwitch.self.url);

for (const dispose of cleanups.reverse()) await dispose();
await new Promise((resolve) => fakePeer.close(resolve));
await fs.rm(tmp, { recursive: true, force: true });
console.log('done');
