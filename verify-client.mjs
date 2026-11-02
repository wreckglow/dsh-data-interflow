/**
 * Render smoke test for the browser half without a browser.
 * Evaluates client.js against a React stub, activates the plugin, renders the
 * sidebar icon and the panel tree, and checks every translate key exists.
 * Not part of the shipped bundle.
 */
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./client.js', import.meta.url), 'utf8');

const registrations = [];
let plugin = null;

global.window = {
  __ModuleLoader__: {
    load(registration) {
      plugin = registration;
    },
  },
};

const React = {
  Fragment: Symbol('Fragment'),
  createElement(type, props, ...children) {
    if (type === undefined || type === null) throw new Error('createElement received an empty type');
    return { type, props: props || {}, children: children.flat(Infinity) };
  },
  useState(initial) {
    hookCount += 1;
    if (forcePeersTab && hookCount === 2) return ['peers', () => {}];
    return [initial, () => {}];
  },
  useEffect() {},
  useRef() {
    return { current: null };
  },
};

let hookCount = 0;
let forcePeersTab = false;

const now = new Date().toISOString();
const snapshot = {
  self: { id: 'node-a', name: 'WIN-TEST (web)', version: '1.0.0' },
  listen: { enabled: true, url: 'http://127.0.0.1:47810', error: null, host: '127.0.0.1', port: 47810 },
  peers: [
    { url: 'http://127.0.0.1:47811', label: 'office', nodeName: 'Office DSH', nodeId: 'node-b', online: true, lastSeen: now, lastError: '' },
    { url: 'http://127.0.0.1:47812', label: 'laptop', nodeName: 'Laptop DSH', nodeId: 'node-c', online: false, lastSeen: '', lastError: 'connect ECONNREFUSED' },
  ],
  messages: [
    {
      id: 'm1',
      seq: 1,
      ts: now,
      kind: 'alert',
      subject: 'Build finished',
      body: 'The build finished on the office node. '.repeat(20),
      replyTo: '',
      to: 'node-a',
      toLabel: 'office',
      from: { id: 'node-b', name: 'Office DSH' },
      mine: false,
      forMe: true,
      read: false,
    },
    {
      id: 'm2',
      seq: 2,
      ts: now,
      kind: 'note',
      subject: 'Handoff',
      body: 'Please continue with the next task.',
      replyTo: '',
      to: '*',
      toLabel: '(all peers)',
      from: { id: 'node-a', name: 'WIN-TEST' },
      mine: true,
      forMe: true,
      read: true,
    },
    {
      id: 'm3',
      seq: 3,
      ts: now,
      kind: 'request',
      subject: 'Where am I?',
      body: 'Report the current location from the watch.',
      replyTo: '',
      to: 'node-b',
      toLabel: 'office',
      from: { id: 'node-a', name: 'WIN-TEST' },
      mine: true,
      forMe: false,
      read: true,
    },
    {
      id: 'm4',
      seq: 4,
      ts: now,
      kind: 'answer',
      subject: 'Re: Where am I?',
      body: 'The watch reports 31.23, 121.47.',
      replyTo: 'm3',
      to: 'node-a',
      toLabel: '(this instance)',
      from: { id: 'node-b', name: 'Office DSH' },
      mine: false,
      forMe: true,
      read: false,
    },
    {
      id: 'm5',
      seq: 5,
      ts: now,
      kind: 'request',
      subject: 'Pending request',
      body: 'This one still waits for the watch.',
      replyTo: '',
      to: 'node-b',
      toLabel: 'office',
      from: { id: 'node-a', name: 'WIN-TEST' },
      mine: true,
      forMe: false,
      read: true,
    },
  ],
  unread: 2,
  requests: { outgoing: 1, incoming: 0, active: 0 },
  lastSeq: 2,
  lastSync: now,
  settings: { relay: true, pollMs: 2000, maxEvents: 800, dataDir: 'C:/data', tokenConfigured: false, fatalError: '', rpcError: '' },
};

const store = {
  get() {
    return snapshot;
  },
  subscribe() {
    return () => {};
  },
  setError() {},
};

global.fetch = async () => new Response(JSON.stringify({ ok: true, value: snapshot }), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

const dictionaries = {};
const sources = [];

const t = (key, params) => {
  if (!(key in dictionaries.zh)) throw new Error(`missing zh dictionary key: ${key}`);
  const template = dictionaries.zh[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
};

const ctx = {
  effect(fn) {
    const dispose = fn();
    return () => {
      if (typeof dispose === 'function') dispose();
    };
  },
  locale: {
    register(namespace, dicts) {
      dictionaries.zh = dicts.zh;
      dictionaries.en = dicts.en;
      return () => {};
    },
    bind() {
      return t;
    },
    getLocale() {
      return { active: 'zh' };
    },
  },
  slots: {
    inject(key, callback) {
      callback();
      return () => {};
    },
    register(options, component) {
      registrations.push({ options, component });
      return () => {};
    },
  },
};

// Evaluate the bundle in this realm. The source is a classic script that only
// touches `window.__ModuleLoader__`.
// eslint-disable-next-line no-new-func
new Function('window', 'fetch', 'Response', 'setTimeout', 'clearTimeout', `${source}`)(
  global.window,
  global.fetch,
  global.Response,
  global.setTimeout,
  global.clearTimeout,
);

if (!plugin || plugin.id !== '@local/dsh-interflow') throw new Error('client bundle did not register its plugin id');
const exports = plugin.factory((name) => {
  if (name === 'react') return React;
  throw new Error(`unexpected require: ${name}`);
});
if (typeof exports.apply !== 'function') throw new Error('client bundle did not export apply');
exports.apply(ctx);

const sidebar = registrations.find((entry) => entry.options.name === 'sidebar.panellist');
const main = registrations.find((entry) => entry.options.name === 'main');
if (!sidebar) throw new Error('sidebar.panellist was not registered');
if (!main) throw new Error('main panel was not registered');
if (main.options.key !== 'interflow') throw new Error('main panel key mismatch');

for (const key of Object.keys(dictionaries.zh)) {
  if (!(key in dictionaries.en)) throw new Error(`missing en dictionary key: ${key}`);
}

function walk(node) {
  if (Array.isArray(node)) {
    for (const child of node) walk(child);
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'function') {
    walk(node.type({ ...node.props, children: node.children }));
    return;
  }
  if (typeof node.type === 'symbol') {
    walk(node.children);
    return;
  }
  walk(node.children);
  for (const [name, value] of Object.entries(node.props || {})) {
    if (name.startsWith('on') && value !== undefined && typeof value !== 'function') {
      throw new Error(`handler ${name} is not callable`);
    }
  }
}

const render = (element) => walk(element);
render(React.createElement(sidebar.component, { size: 18, active: false }));

const renderPage = (value, peersTab) => {
  const pageStore = {
    get() {
      return value;
    },
    subscribe() {
      return () => {};
    },
    setError() {},
  };
  hookCount = 0;
  forcePeersTab = peersTab;
  render(React.createElement(main.component, { store: pageStore, t, rpc: async () => value, refresh: async () => {} }));
  forcePeersTab = false;
};

renderPage(snapshot, false);
renderPage(snapshot, true);
renderPage({ ...snapshot, messages: [], unread: 0, lastSeq: 0 }, false);
renderPage({ ...snapshot, peers: [], messages: [], unread: 0, lastSeq: 0 }, false);
renderPage({ ...snapshot, peers: [], messages: [], unread: 0, lastSeq: 0 }, true);
renderPage({ ...snapshot, messages: snapshot.messages.filter((message) => message.mine), unread: 0, lastSeq: 1 }, false);
renderPage({
  ...snapshot,
  listen: { enabled: false, url: '', error: null, host: '', port: null },
  settings: { ...snapshot.settings, role: 'spoke', hubUrl: 'http://100.64.0.5:47810' },
  peers: [
    { url: 'http://100.64.0.5:47810', label: 'server', nodeName: 'server', nodeId: 'node-hub', kind: 'hub', online: true, lastSeen: now, lastError: '' },
    { url: '', label: 'watch', nodeName: 'watch', nodeId: 'node-watch', kind: 'member', online: false, lastSeen: '', lastError: '' },
  ],
}, false);
renderPage({
  ...snapshot,
  settings: { ...snapshot.settings, role: 'hub' },
  peers: [
    { url: '', label: 'phone', nodeName: 'phone', nodeId: 'node-phone', kind: 'member', online: true, lastSeen: now, lastError: '' },
    { url: '', label: 'watch', nodeName: 'watch', nodeId: 'node-watch', kind: 'member', online: false, lastSeen: '', lastError: 'ECONNREFUSED' },
  ],
}, true);
renderPage({
  ...snapshot,
  listen: { enabled: false, url: '', error: null, host: '', port: null },
  settings: {
    ...snapshot.settings,
    role: 'mqtt',
    transport: 'mqtt',
    mqttStatus: 'connected',
    mqttUrl: 'wss://broker.emqx.io:8084/mqtt',
    mqttTopic: 'interflow-test-room',
  },
  peers: [
    { url: '', label: 'watch', nodeName: 'watch', nodeId: 'node-watch', kind: 'member', online: true, lastSeen: now, lastError: '' },
  ],
}, true);

console.log('client smoke test OK');
console.log('registrations:', registrations.map((entry) => `${entry.options.name}:${entry.options.id || entry.options.key}`).join(', '));
console.log('dictionary keys:', Object.keys(dictionaries.zh).length);

process.exit(0);
