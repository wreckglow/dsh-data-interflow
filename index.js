/**
 * DSH Interflow — host half.
 *
 * Every DSH instance that enables this plugin becomes one node of a small mesh:
 *
 * - an append-only message log in `dataDir` (state.json + events.jsonl);
 * - a tiny HTTP port for peers (`/health`, `/log`, `/ingest`);
 * - a pull loop that copies each peer's log, deduplicated by message id;
 * - four agent tools (`interflow_*`) over the same engine;
 * - an authenticated browser RPC channel (`/interflow`) for the sidebar panel.
 *
 * Delivery is store-and-forward: a message is committed to the sender's log
 * before any network call, and every node copies what it has not seen yet. A
 * peer that was offline receives the message when it syncs again; a peer with
 * no direct connection can still receive it through a relay node.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createMqttTransport } from './mqtt-transport.js';

const VERSION = '1.0.0';
const PROTOCOL = 1;
const MAX_HTTP_BODY = 256 * 1024;
const MAX_MESSAGE_BODY = 16000;
const MAX_SUBJECT = 200;
const MAX_EVENTS_PER_REQUEST = 200;
const KINDS = new Set(['note', 'alert', 'question', 'answer', 'handoff', 'request']);
const DEFAULT_PORT = 47810;

/** A failure whose message may be shown to a user or an agent. */
class InterflowError extends Error {
  /**
   * @param {string} code - Stable machine-readable code.
   * @param {string} message - Human-readable explanation.
   */
  constructor(code, message) {
    super(message);
    this.name = 'InterflowError';
    this.code = code;
  }
}

/** Tools are always visible when the plugin is active. */
export const inject = ['tools'];

/**
 * Start the host half: engine, agent tools, and the browser RPC channel.
 * @param {object} ctx - Host plugin context.
 * @param {object} config - Loader row config.
 */
export function apply(ctx, config) {
  const engine = createEngine(ctx, config);

  ctx.effect(() => {
    engine.start().catch((error) => engine.recordFatal(error));
    return () => engine.stop();
  }, 'interflow: messaging engine');
  registerTools(ctx, engine);
  ctx.inject(['connection'], (connectionCtx) => {
    try {
      connectionCtx.effect(() => connectionCtx.connection.fetch.register({
        path: '/api/interflow',
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => handlePanelRequest(request, engine),
      }), 'interflow: browser route');
    } catch (error) {
      engine.recordRpcError(error);
    }
  });
}

// ---------------------------------------------------------------------------
// Configuration and small helpers
// ---------------------------------------------------------------------------

/**
 * Normalize the loader row config into the engine's settings.
 * @param {unknown} raw - Loader row config.
 * @returns {object} Complete settings with defaults.
 */
function normalizeConfig(raw) {
  const input = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const profile = typeof process.env.DSH_PROFILE === 'string' && process.env.DSH_PROFILE
    ? process.env.DSH_PROFILE
    : typeof process.env.DSH_PROFILE_DIR === 'string' && process.env.DSH_PROFILE_DIR
      ? path.basename(process.env.DSH_PROFILE_DIR)
      : 'default';
  const dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const port = Number.isInteger(input.listenPort) && input.listenPort >= 0 && input.listenPort <= 65535
    ? input.listenPort
    : DEFAULT_PORT;
  const roleInput = clampText(input.role, 16).toLowerCase();
  const hubUrl = normalizeUrl(input.hubUrl);
  const role = roleInput === 'hub' || roleInput === 'spoke' || roleInput === 'peer'
    ? roleInput
    : hubUrl
      ? 'spoke'
      : 'peer';
  const transport = input.transport === 'mqtt' ? 'mqtt' : 'http';
  return {
    nodeName: clampText(input.nodeName, 80)
      || `${os.hostname()}${profile === 'default' ? '' : ` (${profile})`}`,
    role,
    transport,
    hubUrl: hubUrl || '',
    hubToken: typeof input.hubToken === 'string' ? input.hubToken : '',
    mqttUrl: clampText(input.mqttUrl, 500),
    mqttTopic: clampText(input.mqttTopic, 200),
    mqttUsername: clampText(input.mqttUsername, 200),
    mqttPassword: typeof input.mqttPassword === 'string' ? input.mqttPassword : '',
    mqttSecret: typeof input.mqttSecret === 'string' ? input.mqttSecret : '',
    listen: role === 'spoke' || transport === 'mqtt' ? input.listen === true : input.listen !== false,
    listenHost: clampText(input.listenHost, 120) || '127.0.0.1',
    listenPort: port,
    token: typeof input.token === 'string' ? input.token : '',
    peers: Array.isArray(input.peers) ? input.peers : [],
    pollMs: Number.isFinite(input.pollMs) && input.pollMs >= 500
      ? Math.min(Math.floor(input.pollMs), 60000)
      : 2000,
    presenceWindowMs: Number.isFinite(input.presenceWindowMs) && input.presenceWindowMs >= 1000
      ? Math.min(Math.floor(input.presenceWindowMs), 300000)
      : 15000,
    relay: input.relay !== false,
    maxEvents: Number.isInteger(input.maxEvents) && input.maxEvents >= 50
      ? Math.min(input.maxEvents, 5000)
      : 800,
    executeRequests: input.executeRequests === true,
    allowedRequesters: Array.isArray(input.allowedRequesters)
      ? input.allowedRequesters
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => value.trim())
        .slice(0, 50)
      : [],
    remoteCwd: clampText(input.remoteCwd, 1000),
    requestTimeoutMs: Number.isFinite(input.requestTimeoutMs) && input.requestTimeoutMs >= 5000
      ? Math.min(Math.floor(input.requestTimeoutMs), 30 * 60000)
      : 120000,
    maxRemoteRequests: Number.isInteger(input.maxRemoteRequests) && input.maxRemoteRequests >= 1
      ? Math.min(input.maxRemoteRequests, 4)
      : 1,
    dataDir: clampText(input.dataDir, 1000)
      || path.join(dshHome, 'integrations', 'interflow', profile),
  };
}

/**
 * Trim a value to a non-empty bounded string.
 * @param {unknown} value - Candidate text.
 * @param {number} max - Maximum length after trimming.
 * @returns {string} Trimmed text, or '' for non-strings.
 */
function clampText(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

/**
 * Bound an integer argument.
 * @param {unknown} value - Candidate number.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @param {number} fallback - Value used when the input is not a finite number.
 * @returns {number} The bounded integer.
 */
function clampInt(value, min, max, fallback) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

/** @returns {string} Current time as an ISO timestamp. */
function nowIso() {
  return new Date().toISOString();
}

/** @returns {string} A random UUID. */
function uuid() {
  return crypto.randomUUID();
}

/**
 * Compare two secrets without leaking length through early exit timing.
 * @param {string} a - Supplied value.
 * @param {string} b - Expected value.
 * @returns {boolean} Whether they match.
 */
function secretsEqual(a, b) {
  const left = Buffer.from(String(a), 'utf8');
  const right = Buffer.from(String(b), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * Normalize a peer address to `scheme://host[:port]`.
 * @param {unknown} value - URL, `host:port`, or origin-like text.
 * @returns {string|null} Normalized origin, or null when it is not an HTTP origin.
 */
function normalizeUrl(value) {
  if (typeof value !== 'string') return null;
  let text = value.trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `http://${text}`;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname) return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  if (url.search || url.hash) return null;
  return `${url.protocol}//${url.host}`.toLowerCase();
}

/**
 * Put an IPv6 literal in URL brackets.
 * @param {string} host - Bind or advertised host.
 * @returns {string} Host safe for a URL authority.
 */
function urlHost(host) {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

/**
 * Whether a bind address is a loopback literal.
 * @param {string} host - Bind address.
 * @returns {boolean} True for 127/8, ::1, and localhost.
 */
function isLoopbackHost(host) {
  const text = String(host).toLowerCase();
  return text === 'localhost' || text === '::1' || text === '::ffff:127.0.0.1' || /^127\./.test(text);
}

/**
 * Whether a bind address requests every interface.
 * @param {string} host - Bind address.
 * @returns {boolean} True for 0.0.0.0 and ::.
 */
function isWildcardHost(host) {
  const text = String(host).toLowerCase();
  return text === '0.0.0.0' || text === '::' || text === '[::]';
}

/**
 * Whether a socket address belongs to this machine.
 * @param {string|undefined} address - `req.socket.remoteAddress`.
 * @returns {boolean} True for loopback peers.
 */
function isLoopbackAddress(address) {
  const text = String(address || '').toLowerCase();
  return text === '::1' || text === '127.0.0.1' || text.startsWith('127.') || text === '::ffff:127.0.0.1';
}

/** @returns {string|null} First non-internal IPv4 address, if any. */
function lanAddress() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry && entry.family === 'IPv4' && !entry.internal) return entry.address;
    }
  }
  return null;
}

/**
 * Which fields make a message valid.
 * @param {unknown} raw - Untrusted event object.
 * @returns {object|null} Normalized event, or null when unusable.
 */
function normalizeEvent(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = clampText(raw.id, 120);
  const origin = clampText(raw.origin, 120);
  if (!id || !origin) return null;
  return {
    id,
    ts: clampText(raw.ts, 40) || nowIso(),
    origin,
    originName: clampText(raw.originName, 80) || origin.slice(0, 8),
    to: clampText(raw.to, 200) || '*',
    kind: KINDS.has(raw.kind) ? raw.kind : 'note',
    subject: clampText(raw.subject, MAX_SUBJECT) || '(no subject)',
    body: clampText(raw.body, MAX_MESSAGE_BODY),
    replyTo: clampText(raw.replyTo, 120) || null,
  };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Build one engine bound to a plugin context.
 * @param {object} ctx - Host plugin context.
 * @param {unknown} rawConfig - Loader row config.
 * @returns {object} Engine API used by tools and the browser channel.
 */
function createEngine(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig);
  const stateFile = path.join(config.dataDir, 'state.json');
  const eventsFile = path.join(config.dataDir, 'events.jsonl');

  /** @type {string|null} */
  let nodeId = null;
  let nodeName = config.nodeName;
  /** @type {Array<{seq:number,event:object}>} */
  let events = [];
  let seq = 0;
  let firstSeq = 1;
  /** @type {Array<object>} */
  let peers = [];
  /** @type {Array<{id:string,name:string,firstSeen:string,lastSeen:string}>} */
  let members = [];
  /** @type {Array<{id:string,name:string,role:string,online:boolean,lastSeen:string}>} */
  let meshMembers = [];
  /** @type {{url:string,id:string,name:string}|null} */
  let hubInfo = null;
  /** @type {Set<string>} */
  let handledRequests = new Set();
  /** @type {Map<string,{requestId:string,sessionId:string|null,startedAt:string,abort:AbortController}>} */
  const activeRequests = new Map();
  /** @type {Array<{id:string,name:string,online:boolean,lastSeen:string}>} */
  let mqttMembers = [];
  let mqttStatus = 'idle';
  let mqttError = '';
  /** @type {{start:Function,stop:Function,publish:Function,getMembers:Function,getStatus:Function}|null} */
  let mqttTransport = null;
  /** @type {{transport:'mqtt'|'http',mqttUrl?:string,mqttTopic?:string,mqttSecret?:string,mqttUsername?:string,mqttPassword?:string}|null} */
  let transportOverride = null;
  /** @type {Set<string>} */
  let removedPeers = new Set();
  /** @type {Set<string>} */
  let readIds = new Set();
  const seen = new Set();
  let linesOnDisk = 0;

  const listenState = { enabled: false, host: config.listenHost, port: null, url: null, error: null };
  let fatalError = null;
  let rpcError = null;
  /** @type {import('node:http').Server|null} */
  let server = null;
  let pollTimer = null;
  let persistTimer = null;
  let stopped = false;
  let started = false;
  let writeChain = Promise.resolve();
  let lastSync = null;

  /**
   * Report a non-fatal problem without taking the plugin down.
   * @param {unknown} error - Failure to report.
   */
  function warn(error) {
    // eslint-disable-next-line no-console
    console.warn('[interflow]', error instanceof Error ? error.message : error);
  }

  /**
   * Remember a fatal startup failure so the panel can show it.
   * @param {unknown} error - Failure to record.
   */
  function recordFatal(error) {
    fatalError = error instanceof Error ? error.message : String(error);
    listenState.error = fatalError;
    warn(error);
  }

  /**
   * Remember a browser-channel registration failure so the panel can show it.
   * @param {unknown} error - Failure to record.
   */
  function recordRpcError(error) {
    rpcError = error instanceof Error ? (error.stack || error.message) : String(error);
    warn(error);
  }

  // -- state ---------------------------------------------------------------

  /** Load state.json and events.jsonl, tolerating a first run. */
  async function loadState() {
    await fs.mkdir(config.dataDir, { recursive: true });

    let state = null;
    try {
      state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    } catch (error) {
      if (error && error.code !== 'ENOENT') {
        const backup = `${stateFile}.bad-${Date.now()}`;
        await fs.rename(stateFile, backup).catch(() => {});
        warn(`state.json was unreadable and was moved to ${backup}`);
      }
    }
    if (state && typeof state === 'object' && !Array.isArray(state)) {
      nodeId = typeof state.nodeId === 'string' && state.nodeId ? state.nodeId : null;
      if (Number.isInteger(state.seq) && state.seq >= 0) seq = state.seq;
      if (Number.isInteger(state.firstSeq) && state.firstSeq >= 1) firstSeq = state.firstSeq;
      if (Array.isArray(state.peers)) {
        peers = state.peers.map((peer) => restorePeer(peer)).filter(Boolean);
      }
      if (Array.isArray(state.members)) {
        members = state.members
          .filter((member) => member && typeof member.id === 'string' && member.id)
          .map((member) => ({
            id: member.id,
            name: clampText(member.name, 80) || member.id.slice(0, 8),
            firstSeen: typeof member.firstSeen === 'string' ? member.firstSeen : nowIso(),
            lastSeen: typeof member.lastSeen === 'string' ? member.lastSeen : nowIso(),
          }))
          .slice(-32);
      }
      if (Array.isArray(state.removedPeers)) {
        removedPeers = new Set(state.removedPeers.filter((url) => typeof url === 'string'));
      }
      if (Array.isArray(state.readIds)) {
        readIds = new Set(state.readIds.filter((id) => typeof id === 'string'));
      }
      if (Array.isArray(state.handledRequests)) {
        handledRequests = new Set(state.handledRequests.filter((id) => typeof id === 'string'));
      }
      if (state.transportOverride && (state.transportOverride.transport === 'mqtt' || state.transportOverride.transport === 'http')) {
        transportOverride = state.transportOverride;
      }
    }
    if (!nodeId) nodeId = uuid();

    await loadEvents();
    seq = Math.max(seq, events.length > 0 ? events[events.length - 1].seq : 0);
    firstSeq = events.length > 0 ? events[0].seq : seq + 1;

    // Config peers are initial defaults: once removed in the panel they stay gone.
    for (const raw of config.peers) {
      const url = normalizeUrl(raw && raw.url);
      if (!url || removedPeers.has(url)) continue;
      if (peers.some((peer) => peer.url === url)) continue;
      peers.push(makePeer({ label: raw.label, url, token: raw.token }));
    }

    // A spoke always has exactly one designated upstream mailbox.
    if (config.role === 'spoke') {
      if (!config.hubUrl) {
        recordFatal(new Error('Spoke role requires hubUrl (the mailbox origin).'));
      } else {
        let hub = peers.find((peer) => peer.url === config.hubUrl);
        if (!hub) {
          hub = makePeer({
            label: 'hub',
            url: config.hubUrl,
            token: config.hubToken || config.token,
            mode: 'hub',
          });
          peers.push(hub);
        }
        hub.mode = 'hub';
        hub.token = config.hubToken || config.token || hub.token;
      }
    }

    schedulePersist();
  }

  /** Read the append-only event log. */
  async function loadEvents() {
    let text;
    try {
      text = await fs.readFile(eventsFile, 'utf8');
    } catch (error) {
      if (error && error.code !== 'ENOENT') warn(error);
      return;
    }
    const loaded = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      linesOnDisk += 1;
      try {
        const record = JSON.parse(line);
        const event = normalizeEvent(record && record.event);
        const recordSeq = Number(record && record.seq);
        if (!event || !Number.isFinite(recordSeq)) continue;
        loaded.push({ seq: recordSeq, event });
      } catch {
        // A torn line is ignored; the rest of the log remains readable.
      }
    }
    loaded.sort((left, right) => left.seq - right.seq);
    const deduped = [];
    for (const record of loaded) {
      if (seen.has(record.event.id)) continue;
      seen.add(record.event.id);
      deduped.push(record);
    }
    events = deduped.length > config.maxEvents ? deduped.slice(-config.maxEvents) : deduped;
  }

  /**
   * Restore one persisted peer.
   * @param {unknown} raw - Stored peer record.
   * @returns {object|null} Peer with runtime fields reset, or null.
   */
  function restorePeer(raw) {
    if (raw === null || typeof raw !== 'object') return null;
    const url = normalizeUrl(raw.url);
    if (!url) return null;
    const peer = makePeer({ label: raw.label, url, token: raw.token, mode: raw.mode });
    peer.cursor = Number.isInteger(raw.cursor) && raw.cursor >= 0 ? raw.cursor : 0;
    peer.pushCursor = Number.isInteger(raw.pushCursor) && raw.pushCursor >= 0 ? raw.pushCursor : 0;
    peer.nodeId = typeof raw.nodeId === 'string' ? raw.nodeId : null;
    peer.nodeName = typeof raw.nodeName === 'string' ? raw.nodeName : null;
    return peer;
  }

  /**
   * Create one peer record.
   * @param {{label?: unknown, url: string, token?: unknown, mode?: string}} input - Peer identity.
   * @returns {object} Runtime peer.
   */
  function makePeer(input) {
    return {
      url: input.url,
      label: clampText(input.label, 80),
      token: typeof input.token === 'string' ? input.token : '',
      mode: input.mode === 'hub' ? 'hub' : 'peer',
      cursor: 0,
      pushCursor: 0,
      nodeId: null,
      nodeName: null,
      lastSeen: null,
      lastError: null,
      failures: 0,
      nextAttempt: 0,
    };
  }

  /** Persist the durable slice of engine state. */
  async function persist() {
    const state = {
      version: 1,
      nodeId,
      nodeName,
      seq,
      firstSeq,
      peers: peers.map((peer) => ({
        url: peer.url,
        label: peer.label,
        token: peer.token,
        mode: peer.mode,
        cursor: peer.cursor,
        pushCursor: peer.pushCursor,
        nodeId: peer.nodeId,
        nodeName: peer.nodeName,
      })),
      members: members.map((member) => ({
        id: member.id,
        name: member.name,
        firstSeen: member.firstSeen,
        lastSeen: member.lastSeen,
      })),
      removedPeers: [...removedPeers].slice(-100),
      readIds: [...readIds].slice(-2000),
      handledRequests: [...handledRequests].slice(-500),
      transportOverride,
    };
    const temporary = `${stateFile}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(state), 'utf8');
    await fs.rename(temporary, stateFile);
  }

  /** Debounce persistence so a burst of messages writes once. */
  function schedulePersist() {
    if (persistTimer || stopped) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persist().catch((error) => warn(error));
    }, 400);
    if (typeof persistTimer.unref === 'function') persistTimer.unref();
  }

  /**
   * Append one record to the event log, compacting when it grows too long.
   * @param {{seq:number,event:object}} record - Record to append.
   */
  function appendLine(record) {
    const line = `${JSON.stringify(record)}\n`;
    linesOnDisk += 1;
    writeChain = writeChain
      .then(() => fs.appendFile(eventsFile, line, 'utf8'))
      .catch((error) => warn(error));
    if (linesOnDisk > config.maxEvents * 2) {
      writeChain = writeChain.then(() => compactLog()).catch((error) => warn(error));
    }
  }

  /** Rewrite the event file with the retained window. */
  async function compactLog() {
    const body = events.map((record) => `${JSON.stringify(record)}\n`).join('');
    const temporary = `${eventsFile}.tmp`;
    await fs.writeFile(temporary, body, 'utf8');
    await fs.rename(temporary, eventsFile);
    linesOnDisk = events.length;
  }

  // -- identity ------------------------------------------------------------

  /**
   * Every origin string that means "this instance".
   * @returns {Set<string>} Node id, node name, and reachable self URLs.
   */
  function selfUrls() {
    const urls = new Set();
    const port = listenState.port;
    if (port) {
      const hosts = new Set(['127.0.0.1', 'localhost', os.hostname(), config.listenHost]);
      const lan = lanAddress();
      if (lan) hosts.add(lan);
      if (listenState.url) {
        const advertised = normalizeUrl(listenState.url);
        if (advertised) urls.add(advertised);
      }
      for (const host of hosts) {
        const normalized = normalizeUrl(`http://${urlHost(host)}:${port}`);
        if (normalized) urls.add(normalized);
      }
    }
    return urls;
  }

  /**
   * Whether this engine currently uses MQTT (runtime override wins).
   * @returns {'mqtt'|'http'} Effective transport.
   */
  function effectiveTransport() {
    return transportOverride ? transportOverride.transport : config.transport;
  }

  /**
   * Effective MQTT settings, preferring the runtime override over the row config.
   * @returns {{url:string,topic:string,secret:string,username:string,password:string}} Settings.
   */
  function mqttSettings() {
    const override = transportOverride && transportOverride.transport === 'mqtt' ? transportOverride : null;
    return {
      url: (override && override.mqttUrl) || config.mqttUrl,
      topic: (override && override.mqttTopic) || config.mqttTopic,
      secret: (override && override.mqttSecret) || config.mqttSecret || config.token,
      username: (override && typeof override.mqttUsername === 'string' ? override.mqttUsername : '') || config.mqttUsername,
      password: (override && typeof override.mqttPassword === 'string' ? override.mqttPassword : '') || config.mqttPassword,
    };
  }

  /**
   * Whether a message is addressed to this instance.
   * @param {object} event - Message to inspect.
   * @returns {boolean} True for broadcast, node id, node name, or a self URL.
   */
  function isForMe(event, urls = selfUrls()) {
    if (event.to === '*') return true;
    if (event.to === nodeId || event.to === nodeName) return true;
    const normalized = normalizeUrl(event.to);
    return normalized !== null && urls.has(normalized);
  }

  // -- listener ------------------------------------------------------------

  /** Start the peer-facing HTTP listener when configured. */
  async function startListener() {
    if (config.role === 'spoke' || effectiveTransport() === 'mqtt') {
      listenState.enabled = false;
      listenState.error = null;
      return;
    }
    if (!config.listen) {
      listenState.enabled = false;
      listenState.error = null;
      return;
    }
    if (!isLoopbackHost(config.listenHost) && !config.token) {
      listenState.enabled = false;
      listenState.error = 'A shared token is required to listen beyond loopback.';
      return;
    }
    const attempts = config.listenPort === 0 ? 1 : 21;
    for (let offset = 0; offset < attempts; offset += 1) {
      const port = config.listenPort === 0 ? 0 : config.listenPort + offset;
      try {
        await bind(port);
        return;
      } catch (error) {
        if (error && error.code === 'EADDRINUSE') continue;
        listenState.enabled = false;
        listenState.error = error instanceof Error ? error.message : String(error);
        return;
      }
    }
    listenState.enabled = false;
    listenState.error = `Ports ${config.listenPort}-${config.listenPort + 20} are in use.`;
  }

  /**
   * Bind one port.
   * @param {number} port - Port to bind (0 lets the OS choose).
   * @returns {Promise<void>} Resolves once listening.
   */
  function bind(port) {
    return new Promise((resolve, reject) => {
      const candidate = http.createServer((request, response) => {
        handleRequest(request, response).catch((error) => {
          sendJson(response, 500, { ok: false, error: 'internal_error', message: String(error && error.message) });
        });
      });
      const onError = (error) => {
        candidate.removeListener('listening', onListening);
        candidate.close(() => {});
        reject(error);
      };
      const onListening = () => {
        candidate.removeListener('error', onError);
        candidate.on('error', (error) => warn(error));
        server = candidate;
        const address = candidate.address();
        const actualPort = address && typeof address === 'object' ? address.port : port;
        const advertised = isWildcardHost(config.listenHost) ? lanAddress() || '127.0.0.1' : config.listenHost;
        listenState.enabled = true;
        listenState.host = config.listenHost;
        listenState.port = actualPort;
        listenState.url = `http://${urlHost(advertised)}:${actualPort}`;
        listenState.error = null;
        resolve();
      };
      candidate.once('error', onError);
      candidate.once('listening', onListening);
      candidate.listen(port, config.listenHost);
    });
  }

  /**
   * Whether a request may use the peer API.
   * @param {import('node:http').IncomingMessage} request - Incoming request.
   * @returns {boolean} True when the token or the loopback rule admits it.
   */
  function authorized(request) {
    if (config.token) {
      const header = request.headers['x-interflow-token'];
      const bearer = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const provided = typeof header === 'string' ? header : bearer;
      return typeof provided === 'string' && secretsEqual(provided, config.token);
    }
    return isLoopbackAddress(request.socket && request.socket.remoteAddress);
  }

  /**
   * Route one peer API request.
   * @param {import('node:http').IncomingMessage} request - Incoming request.
   * @param {import('node:http').ServerResponse} response - Response owner.
   */
  async function handleRequest(request, response) {
    if (!authorized(request)) {
      sendJson(response, 401, { ok: false, error: 'unauthorized' });
      return;
    }
    const url = new URL(request.url || '/', 'http://interflow.local');
    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, {
        ok: true,
        protocol: PROTOCOL,
        version: VERSION,
        node: { id: nodeId, name: nodeName },
        time: nowIso(),
      });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/log') {
      const since = clampInt(url.searchParams.get('since'), 0, Number.MAX_SAFE_INTEGER, 0);
      const limit = clampInt(url.searchParams.get('limit'), 1, 500, MAX_EVENTS_PER_REQUEST);
      await sendLog(response, since, limit);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/inbox') {
      if (config.role !== 'hub') {
        sendJson(response, 404, { ok: false, error: 'not_a_hub' });
        return;
      }
      sendInbox(response, url);
      return;
    }
    if (request.method === 'POST' && (url.pathname === '/ingest' || url.pathname === '/send')) {
      let body;
      try {
        body = await readJsonBody(request);
      } catch (error) {
        sendJson(response, 400, { ok: false, error: 'invalid_body', message: String(error && error.message) });
        return;
      }
      const incoming = Array.isArray(body && body.events)
        ? body.events
        : body && body.event
          ? [body.event]
          : body && body.id
            ? [body]
            : [];
      let accepted = 0;
      for (const raw of incoming.slice(0, MAX_EVENTS_PER_REQUEST)) {
        if (config.role === 'hub') {
          const event = normalizeEvent(raw);
          if (event) touchMember(event.origin, event.originName);
        }
        if (ingestRemote(raw)) accepted += 1;
      }
      sendJson(response, 200, { ok: true, accepted, lastSeq: seq });
      return;
    }
    sendJson(response, 404, { ok: false, error: 'not_found' });
  }

  /**
   * Answer one member's mailbox pull: only events addressed to that member,
   * broadcast, or originated by it.
   * @param {import('node:http').ServerResponse} response - Response owner.
   * @param {URL} url - Request URL with member/name/since/limit.
   */
  function sendInbox(response, url) {
    const memberId = clampText(url.searchParams.get('member'), 120);
    if (!memberId) {
      sendJson(response, 400, { ok: false, error: 'member_required' });
      return;
    }
    const memberName = clampText(url.searchParams.get('name'), 80) || memberId.slice(0, 8);
    touchMember(memberId, memberName);
    const since = clampInt(url.searchParams.get('since'), 0, Number.MAX_SAFE_INTEGER, 0);
    const limit = clampInt(url.searchParams.get('limit'), 1, 500, MAX_EVENTS_PER_REQUEST);
    const start = Math.max(since + 1, firstSeq);
    const page = events
      .filter((record) => record.seq >= start && isForMember(record.event, memberId))
      .slice(0, limit);
    const lastReturned = page.length > 0 ? page[page.length - 1].seq : Math.min(since, seq);
    sendJson(response, 200, {
      ok: true,
      protocol: PROTOCOL,
      version: VERSION,
      role: 'hub',
      node: { id: nodeId, name: nodeName },
      members: memberViews(),
      firstSeq,
      lastSeq: seq,
      reset: since > seq || (since > 0 && since + 1 < firstSeq),
      cursor: lastReturned,
      events: page,
    });
  }

  /**
   * Whether one event belongs in a member's mailbox.
   * @param {object} event - Message.
   * @param {string} memberId - Member node id.
   * @returns {boolean} True for broadcast, direct, or own messages.
   */
  function isForMember(event, memberId) {
    return event.to === '*' || event.to === memberId || event.origin === memberId;
  }

  /**
   * Refresh one member's presence.
   * @param {string} id - Node id.
   * @param {string} name - Display name.
   */
  function touchMember(id, name) {
    if (!id || id === nodeId) return;
    const now = nowIso();
    let member = members.find((candidate) => candidate.id === id);
    if (!member) {
      member = { id, name: name || id.slice(0, 8), firstSeen: now, lastSeen: now };
      members.push(member);
      if (members.length > 32) members = members.slice(-32);
    } else {
      member.lastSeen = now;
      if (name) member.name = name;
    }
    schedulePersist();
  }

  /**
   * Whether a member has checked in recently.
   * @param {object} member - Stored member.
   * @returns {boolean} True when the last contact is fresh.
   */
  function memberOnline(member) {
    const time = Date.parse(member.lastSeen || '');
    return Number.isFinite(time) && Date.now() - time < config.presenceWindowMs;
  }

  /**
   * Hub view of itself and every member that has checked in.
   * @returns {Array<object>} Presence rows.
   */
  function memberViews() {
    return [
      { id: nodeId, name: nodeName, role: 'hub', online: true, lastSeen: nowIso() },
      ...members.map((member) => ({
        id: member.id,
        name: member.name,
        role: 'member',
        online: memberOnline(member),
        lastSeen: member.lastSeen,
      })),
    ];
  }

  /**
   * Answer a log pull.
   * @param {import('node:http').ServerResponse} response - Response owner.
   * @param {number} since - Last sequence the caller already has.
   * @param {number} limit - Maximum records to return.
   */
  async function sendLog(response, since, limit) {
    const start = Math.max(since + 1, firstSeq);
    const page = events.filter((record) => record.seq >= start).slice(0, limit);
    sendJson(response, 200, {
      ok: true,
      protocol: PROTOCOL,
      version: VERSION,
      node: { id: nodeId, name: nodeName },
      firstSeq,
      lastSeq: seq,
      reset: since > seq || (since > 0 && since + 1 < firstSeq),
      cursor: page.length > 0 ? page[page.length - 1].seq : since,
      events: page,
    });
  }

  /**
   * Read a bounded JSON request body.
   * @param {import('node:http').IncomingMessage} request - Incoming request.
   * @returns {Promise<unknown>} Parsed body.
   */
  function readJsonBody(request) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      request.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_HTTP_BODY) {
          request.destroy();
          reject(new Error('request body is too large'));
          return;
        }
        chunks.push(chunk);
      });
      request.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch {
          reject(new Error('body is not JSON'));
        }
      });
      request.on('error', reject);
    });
  }

  /**
   * Write one JSON response.
   * @param {import('node:http').ServerResponse} response - Response owner.
   * @param {number} status - HTTP status.
   * @param {unknown} body - JSON body.
   */
  function sendJson(response, status, body) {
    if (response.writableEnded) return;
    const text = JSON.stringify(body);
    response.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(text),
      'cache-control': 'no-store',
    });
    response.end(text);
  }

  // -- message store -------------------------------------------------------

  /**
   * Store a locally created event and mark it read.
   * @param {object} event - Message to commit.
   */
  function ingestLocal(event) {
    const record = { seq: ++seq, event };
    events.push(record);
    seen.add(event.id);
    readIds.add(event.id);
    trimEvents();
    appendLine(record);
    schedulePersist();
  }

  /**
   * Store an event received from a peer.
   * @param {unknown} raw - Untrusted event.
   * @returns {boolean} Whether it was stored.
   */
  function ingestRemote(raw) {
    const event = normalizeEvent(raw);
    if (!event) return false;
    if (event.origin === nodeId) {
      seen.add(event.id);
      return false;
    }
    if (seen.has(event.id)) return false;
    if (!config.relay && !isForMe(event)) return false;
    const record = { seq: ++seq, event };
    events.push(record);
    seen.add(event.id);
    trimEvents();
    appendLine(record);
    schedulePersist();
    if (event.kind === 'request' && event.to !== '*' && isForMe(event)) {
      queueMicrotask(() => {
        runRequest(event).catch((error) => warn(error));
      });
    }
    return true;
  }

  /** Drop the oldest retained events and keep the dedupe set bounded. */
  function trimEvents() {
    if (events.length > config.maxEvents) {
      events = events.slice(-config.maxEvents);
      firstSeq = events[0].seq;
    }
    if (seen.size > config.maxEvents * 4) {
      seen.clear();
      for (const record of events) seen.add(record.event.id);
    }
  }

  // -- peers ---------------------------------------------------------------

  /**
   * Find a peer or mesh member by label, node name, node id, or URL.
   * @param {unknown} target - User-supplied target.
   * @returns {{kind:'broadcast'}|{kind:'peer',peer:object}|{kind:'member',id:string,label:string}|null} Resolution.
   */
  function resolveTarget(target) {
    const text = clampText(target, 500);
    if (!text || text === '*') return { kind: 'broadcast' };
    const normalized = normalizeUrl(text);
    const lowered = text.toLowerCase();
    const peer = peers.find((candidate) => candidate.nodeId === text
      || (candidate.nodeName && candidate.nodeName.toLowerCase() === lowered)
      || (candidate.label && candidate.label.toLowerCase() === lowered)
      || (normalized !== null && candidate.url === normalized));
    if (peer) return { kind: 'peer', peer };
    const member = members.find((candidate) => candidate.id === text
      || (candidate.name && candidate.name.toLowerCase() === lowered))
      || meshMembers.find((candidate) => candidate.id === text
        || (candidate.name && candidate.name.toLowerCase() === lowered))
      || mqttMembers.find((candidate) => candidate.id === text
        || (candidate.name && candidate.name.toLowerCase() === lowered));
    return member ? { kind: 'member', id: member.id, label: member.name || member.id.slice(0, 8) } : null;
  }

  /**
   * Create and store a message, then push it to every peer.
   * @param {{to?:string, kind?:string, subject?:string, body?:string, replyTo?:string}} input - Message fields.
   * @returns {Promise<{id:string,to:string,toLabel:string,queued:number}>} Stored message summary.
   */
  async function sendMessage(input) {
    if (fatalError) throw new InterflowError('storage_unavailable', fatalError);
    const kind = KINDS.has(input && input.kind) ? input.kind : 'note';
    const subject = clampText(input && input.subject, MAX_SUBJECT) || '(no subject)';
    const body = clampText(input && input.body, MAX_MESSAGE_BODY);
    if (!body) throw new InterflowError('empty_message', 'A message needs a body.');
    if (peers.length === 0 && config.role !== 'hub' && effectiveTransport() !== 'mqtt') {
      throw new InterflowError('no_peers', 'This instance has no peers yet. Connect one first.');
    }
    const target = resolveTarget(input && input.to);
    if (!target) {
      throw new InterflowError('unknown_peer', `No peer matches "${clampText(input && input.to, 80)}".`);
    }
    if (target.kind === 'peer' && !target.peer.nodeId) {
      await Promise.race([syncPeer(target.peer), new Promise((resolve) => setTimeout(resolve, 1500))]);
    }
    const to = target.kind === 'broadcast'
      ? '*'
      : target.kind === 'member'
        ? target.id
        : target.peer.nodeId || target.peer.url;
    const toLabel = target.kind === 'broadcast'
      ? '(all peers)'
      : target.kind === 'member'
        ? target.label
        : peerLabel(target.peer);
    const event = {
      id: uuid(),
      ts: nowIso(),
      origin: nodeId,
      originName: nodeName,
      to,
      kind,
      subject,
      body,
      replyTo: clampText(input && input.replyTo, 120) || null,
    };
    ingestLocal(event);
    if (effectiveTransport() === 'mqtt') {
      if (mqttTransport) {
        mqttTransport.publish(event).catch((error) => {
          mqttError = error instanceof Error ? error.message : String(error);
        });
      }
    } else {
      for (const peer of peers) {
        push(peer, event).catch(() => {});
      }
    }
    return {
      id: event.id,
      to,
      toLabel,
      queued: effectiveTransport() === 'mqtt'
        ? Math.max(1, mqttMembers.length)
        : config.role === 'hub'
          ? members.length
          : peers.length,
    };
  }

  /**
   * Send one event to one peer immediately. Failure is absorbed: the pull loop
   * delivers it later.
   * @param {object} peer - Target peer.
   * @param {object} event - Event to deliver.
   * @returns {Promise<void>} Resolves after the attempt.
   */
  async function push(peer, event) {
    try {
      const result = await request(peer, 'POST', '/ingest', { events: [event] });
      if (!result || result.ok !== true) throw new Error('peer rejected the message');
      peer.lastSeen = nowIso();
      peer.lastError = null;
      peer.failures = 0;
    } catch (error) {
      peer.failures += 1;
      peer.lastError = error instanceof Error ? error.message : String(error);
      peer.nextAttempt = Date.now() + Math.min(config.pollMs * 2 ** Math.min(peer.failures, 4), 30000);
    }
  }

  /**
   * Pull everything new from one peer.
   * @param {object} peer - Peer to sync.
   * @returns {Promise<boolean>} Whether the sync succeeded.
   */
  async function syncPeer(peer) {
    if (Date.now() < peer.nextAttempt) return false;
    try {
      const endpoint = peer.mode === 'hub'
        ? `/inbox?member=${encodeURIComponent(nodeId)}&name=${encodeURIComponent(nodeName)}&since=${peer.cursor}&limit=${MAX_EVENTS_PER_REQUEST}`
        : `/log?since=${peer.cursor}&limit=${MAX_EVENTS_PER_REQUEST}`;
      const result = await request(peer, 'GET', endpoint);
      if (!result || result.ok !== true || !result.node) throw new Error('peer returned an invalid log');
      peer.nodeId = typeof result.node.id === 'string' ? result.node.id : peer.nodeId;
      peer.nodeName = typeof result.node.name === 'string' ? result.node.name : peer.nodeName;
      if (peer.mode === 'hub') {
        hubInfo = {
          url: peer.url,
          id: peer.nodeId || '',
          name: peer.nodeName || '',
        };
      }
      if (Array.isArray(result.members)) {
        meshMembers = result.members.filter((member) => member && typeof member.id === 'string');
      }
      if (result.reset === true) peer.cursor = 0;
      if (Array.isArray(result.events)) {
        for (const item of result.events) {
          if (item && item.event) ingestRemote(item.event);
        }
      }
      if (Number.isFinite(result.cursor)) {
        peer.cursor = Math.max(peer.cursor, result.cursor);
      } else if (Number.isFinite(result.lastSeq)) {
        peer.cursor = Math.max(peer.cursor, result.lastSeq);
      }
      peer.lastSeen = nowIso();
      peer.lastError = null;
      peer.failures = 0;
      peer.nextAttempt = 0;
      lastSync = peer.lastSeen;
      schedulePersist();
      await pushBacklog(peer);
      return true;
    } catch (error) {
      peer.failures += 1;
      peer.lastError = error instanceof Error ? error.message : String(error);
      peer.nextAttempt = Date.now() + Math.min(config.pollMs * 2 ** Math.min(peer.failures, 5), 60000);
      return false;
    }
  }

  /**
   * Upload everything this node stores that the peer has not accepted yet.
   * This is what makes an outbound-only spoke a reliable writer: messages
   * created while the mailbox was unreachable are retried on the next sync.
   * @param {object} peer - Peer or hub.
   * @returns {Promise<void>} Resolves once the backlog is drained or the peer refuses.
   */
  async function pushBacklog(peer) {
    for (let round = 0; round < 5; round += 1) {
      const pending = events.filter((record) => record.seq > peer.pushCursor);
      if (pending.length === 0) return;
      const batch = pending
        .filter((record) => record.event.origin !== peer.nodeId)
        .slice(0, MAX_EVENTS_PER_REQUEST);
      if (batch.length === 0) {
        peer.pushCursor = pending[pending.length - 1].seq;
        schedulePersist();
        return;
      }
      const result = await request(peer, 'POST', '/ingest', {
        events: batch.map((record) => record.event),
      });
      if (!result || result.ok !== true) throw new Error('peer rejected the backlog');
      peer.pushCursor = batch[batch.length - 1].seq;
      schedulePersist();
      if (batch.length < MAX_EVENTS_PER_REQUEST) return;
    }
  }

  /**
   * Send a directed task request. The target device may execute it locally and
   * answer with a correlated `answer` message.
   * @param {{to?:string, subject?:string, body?:string}} input - Request fields.
   * @returns {Promise<{id:string,to:string,toLabel:string,queued:number}>} Stored request.
   */
  async function requestRemote(input) {
    const to = clampText(input && input.to, 500);
    if (!to || to === '*') {
      throw new InterflowError('request_target_required', 'A request needs one target device.');
    }
    return sendMessage({ ...input, to, kind: 'request' });
  }

  /**
   * Execute one incoming request on this device and answer through the mailbox.
   * @param {object} request - Stored request event.
   * @returns {Promise<void>} Resolves after the answer (or failure) is stored.
   */
  async function runRequest(request) {
    if (!request || !request.id || handledRequests.has(request.id)) return;
    handledRequests.add(request.id);
    if (handledRequests.size > 800) {
      handledRequests = new Set([...handledRequests].slice(-500));
    }
    schedulePersist();

    if (!config.executeRequests) {
      replyToRequest(request, 'Remote execution is disabled on this device. Set executeRequests: true to let it run requests.', 'Request declined');
      return;
    }
    if (config.allowedRequesters.length > 0) {
      const name = String(request.originName || '').toLowerCase();
      const allowed = config.allowedRequesters.some((candidate) => candidate === '*'
        || candidate === request.origin
        || candidate.toLowerCase() === name);
      if (!allowed) {
        replyToRequest(request, 'This device does not accept requests from that sender.', 'Request refused');
        return;
      }
    }
    if (activeRequests.size >= config.maxRemoteRequests) {
      replyToRequest(request, 'This device is busy with another request. Try again later.', 'Request busy');
      return;
    }

    const sessionController = typeof ctx.get === 'function' ? ctx.get('sessionController') : undefined;
    if (!sessionController) {
      replyToRequest(request, 'Remote execution is unavailable because this profile has no session controller.', 'Request unavailable');
      return;
    }

    const abort = new AbortController();
    const active = {
      requestId: request.id,
      sessionId: null,
      startedAt: nowIso(),
      abort,
    };
    activeRequests.set(request.id, active);
    let timer = null;
    try {
      const created = await sessionController.create(config.remoteCwd ? { cwd: config.remoteCwd } : {});
      active.sessionId = created && created.sessionId ? created.sessionId : null;
      if (!active.sessionId) throw new Error('the session controller returned no session id');
      const prompt = buildRemotePrompt(request);
      const follow = sessionController.follow({
        address: { kind: 'session', sessionId: active.sessionId },
      }, abort.signal);
      const consume = consumeAnswer(follow, abort.signal);
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          abort.abort();
          reject(new Error('request timed out'));
        }, config.requestTimeoutMs);
      });
      await sessionController.prompt({
        requestId: uuid(),
        sessionId: active.sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: prompt }],
      }, abort.signal);
      const result = await Promise.race([consume, deadline]);
      if (abort.signal.aborted) throw new Error('request timed out');
      if (!result.completed) throw new Error('the remote turn did not complete');
      replyToRequest(request, result.text || '(no text answer)', `Re: ${request.subject}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (abort.signal.aborted) {
        if (active.sessionId) {
          try {
            sessionController.cancel({ sessionId: active.sessionId });
          } catch {
            // The session may already be gone.
          }
        }
        replyToRequest(request, `Request failed: timed out after ${Math.round(config.requestTimeoutMs / 1000)}s.`, 'Request timed out');
      } else {
        replyToRequest(request, `Request failed: ${message}`, 'Request failed');
      }
    } finally {
      if (timer) clearTimeout(timer);
      activeRequests.delete(request.id);
      schedulePersist();
    }
  }

  /**
   * Consume one session event stream until its first completed turn.
   * @param {AsyncIterable<object>} stream - Follow stream.
   * @param {AbortSignal} signal - Cancellation.
   * @returns {Promise<{text:string,completed:boolean}>} Last assistant text and completion.
   */
  async function consumeAnswer(stream, signal) {
    let text = '';
    let completed = false;
    for await (const frame of stream) {
      if (signal.aborted) throw new Error('request aborted');
      if (!frame) continue;
      if (frame.type === 'snapshot') {
        for (const record of frame.records || []) {
          const event = record && record.event;
          if (!event) continue;
          if (event.type === 'assistant/message') {
            text = assistantText(event.data) || text;
          }
          if (event.type === 'turn/end') {
            completed = turnCompleted(event.data);
            if (completed) break;
          }
        }
        if (completed) break;
        continue;
      }
      if (frame.type !== 'event') continue;
      const event = frame.event;
      if (!event) continue;
      if (event.type === 'assistant/message') {
        text = assistantText(event.data) || text;
      }
      if (event.type === 'turn/end') {
        completed = turnCompleted(event.data);
        break;
      }
    }
    return { text, completed };
  }

  /**
   * Plain text of one assistant message.
   * @param {object} data - `assistant/message` event data.
   * @returns {string} Joined text blocks.
   */
  function assistantText(data) {
    const blocks = data && data.message && Array.isArray(data.message.content) ? data.message.content : [];
    return blocks
      .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')
      .trim();
  }

  /**
   * Whether one turn ended successfully.
   * @param {object} data - `turn/end` event data.
   * @returns {boolean} True for a completed turn.
   */
  function turnCompleted(data) {
    return Boolean(data && data.reason && data.reason.kind === 'completed');
  }

  /**
   * Prompt wrapper for a remote request.
   * @param {object} request - Stored request event.
   * @returns {string} Session prompt.
   */
  function buildRemotePrompt(request) {
    return [
      `A remote DSH instance (${request.originName || request.origin}) sent this request through Interflow.`,
      'Use your local tools and knowledge to fulfill it. Your final assistant message is returned to the requester verbatim, so answer with the result or the concrete reason you cannot.',
      '',
      `Subject: ${request.subject}`,
      `Request: ${request.body}`,
    ].join('\n');
  }

  /**
   * Store an answer to one request and push it to peers.
   * @param {object} request - Original request event.
   * @param {string} body - Answer text.
   * @param {string} subject - Answer subject.
   */
  function replyToRequest(request, body, subject) {
    if (!request || !request.origin || request.origin === nodeId) return;
    const reply = {
      id: uuid(),
      ts: nowIso(),
      origin: nodeId,
      originName: nodeName,
      to: request.origin,
      kind: 'answer',
      subject: clampText(subject, MAX_SUBJECT) || `Re: ${request.subject}`,
      body: clampText(body, MAX_MESSAGE_BODY) || '(no text answer)',
      replyTo: request.id,
    };
    ingestLocal(reply);
    if (effectiveTransport() === 'mqtt') {
      if (mqttTransport) {
        mqttTransport.publish(reply).catch((error) => {
          mqttError = error instanceof Error ? error.message : String(error);
        });
      }
    } else {
      for (const peer of peers) {
        push(peer, reply).catch(() => {});
      }
    }
  }

  /**
   * Count unresolved requests and currently running ones.
   * @returns {{outgoing:number,incoming:number,active:number}} Request counters.
   */
  function requestStats() {
    const answered = new Set();
    for (const record of events) {
      if (record.event.kind === 'answer' && record.event.replyTo) answered.add(record.event.replyTo);
    }
    const urls = selfUrls();
    let outgoing = 0;
    let incoming = 0;
    for (const record of events) {
      const event = record.event;
      if (event.kind !== 'request' || answered.has(event.id)) continue;
      if (event.origin === nodeId) outgoing += 1;
      else if (event.to !== '*' && isForMe(event, urls)) incoming += 1;
    }
    return { outgoing, incoming, active: activeRequests.size };
  }

  /**
   * Call one peer endpoint.
   * @param {object} peer - Target peer.
   * @param {'GET'|'POST'} method - HTTP method.
   * @param {string} endpoint - Path below the peer origin.
   * @param {unknown} [body] - JSON body for POST.
   * @returns {Promise<any>} Parsed JSON response.
   */
  async function request(peer, method, endpoint, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    if (typeof timer.unref === 'function') timer.unref();
    try {
      const token = peer.token || config.token;
      const headers = {};
      if (token) headers['x-interflow-token'] = token;
      if (body !== undefined) headers['content-type'] = 'application/json';
      const response = await fetch(`${peer.url}${endpoint}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Sync every peer once. */
  async function syncAll() {
    await Promise.allSettled(peers.map((peer) => syncPeer(peer)));
  }

  /**
   * Run the peer pull loop.
   * @returns {void}
   */
  function schedulePoll() {
    const tick = async () => {
      if (stopped) return;
      await syncAll();
      if (stopped) return;
      pollTimer = setTimeout(tick, config.pollMs);
      if (typeof pollTimer.unref === 'function') pollTimer.unref();
    };
    pollTimer = setTimeout(tick, 60);
    if (typeof pollTimer.unref === 'function') pollTimer.unref();
  }

  /**
   * Add or update one peer.
   * @param {{label?:string,url:string,token?:string}} input - Peer fields.
   * @returns {Promise<{added:boolean,peer:object}>} Result.
   */
  async function addPeer(input) {
    if (config.transport === 'mqtt') {
      throw new InterflowError('mqtt_auto_discovery', 'MQTT mode discovers devices automatically; peer URLs are not used.');
    }
    const url = normalizeUrl(input && input.url);
    if (!url) throw new InterflowError('invalid_url', 'Peer URL must be an HTTP origin such as http://127.0.0.1:47810.');
    if (selfUrls().has(url)) throw new InterflowError('self_peer', 'That URL is this instance.');
    let peer = peers.find((candidate) => candidate.url === url);
    const added = !peer;
    if (!peer) {
      peer = makePeer({ label: input && input.label, url, token: input && input.token });
      peers.push(peer);
    } else {
      if (typeof input.label === 'string' && input.label.trim()) peer.label = clampText(input.label, 80);
      if (typeof input.token === 'string') peer.token = input.token;
    }
    removedPeers.delete(url);
    schedulePersist();
    void syncPeer(peer);
    return { added, peer: peerView(peer) };
  }

  /**
   * Remove a peer.
   * @param {{url:string}} input - Peer URL.
   * @returns {Promise<{removed:boolean,url:string}>} Result.
   */
  async function removePeer(input) {
    const url = normalizeUrl(input && input.url);
    const index = peers.findIndex((candidate) => candidate.url === url);
    if (index < 0) throw new InterflowError('peer_not_found', 'No configured peer has that URL.');
    const [removed] = peers.splice(index, 1);
    removedPeers.add(removed.url);
    schedulePersist();
    return { removed: true, url: removed.url };
  }

  /**
   * Display label for one peer.
   * @param {object} peer - Peer record.
   * @returns {string} Label, node name, or URL.
   */
  function peerLabel(peer) {
    return peer.label || peer.nodeName || peer.url;
  }

  /**
   * Panel-shaped peer view.
   * @param {object} peer - Peer record.
   * @returns {object} JSON-safe view.
   */
  function peerView(peer) {
    const online = typeof peer.lastSeen === 'string'
      && Date.now() - Date.parse(peer.lastSeen) < Math.max(10000, config.pollMs * 3);
    return {
      url: peer.url,
      label: peerLabel(peer),
      nodeName: peer.nodeName || '',
      nodeId: peer.nodeId || '',
      online,
      lastSeen: peer.lastSeen || '',
      lastError: peer.lastError || '',
    };
  }

  // -- read state ----------------------------------------------------------

  /**
   * Mark messages read.
   * @param {{ids?:string[], all?:boolean}} input - Selection.
   * @returns {Promise<{unread:number}>} Updated unread count.
   */
  async function markRead(input) {
    if (input && input.all === true) {
      for (const record of events) {
        if (isForMe(record.event) && record.event.origin !== nodeId) readIds.add(record.event.id);
      }
    } else if (input && Array.isArray(input.ids)) {
      for (const id of input.ids) {
        if (typeof id === 'string') readIds.add(id);
      }
    }
    if (readIds.size > 3000) {
      readIds = new Set([...readIds].slice(-2000));
    }
    schedulePersist();
    return { unread: unreadCount() };
  }

  /** @returns {number} Unread messages addressed to this instance. */
  function unreadCount() {
    const urls = selfUrls();
    let count = 0;
    for (const record of events) {
      const event = record.event;
      if (event.origin === nodeId || readIds.has(event.id)) continue;
      if (isForMe(event, urls)) count += 1;
    }
    return count;
  }

  /**
   * Panel-shaped message view.
   * @param {{seq:number,event:object}} record - Stored record.
   * @returns {object} JSON-safe view.
   */
  function messageView(record, urls = selfUrls()) {
    const event = record.event;
    const mine = event.origin === nodeId;
    const forMe = isForMe(event, urls);
    let toLabel;
    if (event.to === '*') toLabel = '(all peers)';
    else if (event.to === nodeId) toLabel = '(this instance)';
    else toLabel = labelForNode(event.to);
    return {
      seq: record.seq,
      id: event.id,
      ts: event.ts,
      kind: event.kind,
      subject: event.subject,
      body: event.body,
      replyTo: event.replyTo || '',
      to: event.to,
      toLabel,
      from: { id: event.origin, name: event.originName },
      mine,
      forMe,
      read: mine || readIds.has(event.id),
    };
  }

  /**
   * Display name for one addressed node id.
   * @param {string} id - Node id.
   * @returns {string} Peer label, member name, or the id.
   */
  function labelForNode(id) {
    const peer = peers.find((candidate) => candidate.nodeId === id);
    if (peer) return peerLabel(peer);
    const member = members.find((candidate) => candidate.id === id);
    if (member) return member.name;
    const mesh = meshMembers.find((candidate) => candidate.id === id);
    if (mesh) return mesh.name || mesh.id;
    return id;
  }

  /**
   * Hub-shaped presence row for one member.
   * @param {object} member - Stored member.
   * @returns {object} Panel row.
   */
  function memberView(member) {
    return {
      url: '',
      label: member.name || member.id.slice(0, 8),
      nodeName: member.name || '',
      nodeId: member.id,
      online: memberOnline(member),
      lastSeen: member.lastSeen || '',
      lastError: '',
      kind: 'member',
    };
  }

  /**
   * The devices this instance should show: hub members, spoke mesh, or peers.
   * @returns {Array<object>} Panel rows.
   */
  function deviceViews() {
    if (effectiveTransport() === 'mqtt') {
      return mqttMembers
        .filter((member) => member.id !== nodeId)
        .map((member) => ({
          url: '',
          label: member.name || member.id.slice(0, 8),
          nodeName: member.name || '',
          nodeId: member.id,
          online: member.online !== false,
          lastSeen: member.lastSeen || '',
          lastError: '',
          kind: 'member',
        }))
        .sort((left, right) => left.label.localeCompare(right.label));
    }
    if (config.role === 'hub') {
      return members.map((member) => memberView(member))
        .sort((left, right) => left.label.localeCompare(right.label));
    }
    if (config.role === 'spoke') {
      const hub = peers.find((peer) => peer.mode === 'hub');
      const views = [];
      if (hub) {
        views.push({
          ...peerView(hub),
          kind: 'hub',
          label: hubInfo && hubInfo.name ? hubInfo.name : (hub.label || config.hubUrl),
        });
      }
      for (const member of meshMembers) {
        if (member.id === nodeId) continue;
        if (hub && member.id === hub.nodeId) continue;
        views.push({
          url: '',
          label: member.name || member.id.slice(0, 8),
          nodeName: member.name || '',
          nodeId: member.id,
          online: member.online === true,
          lastSeen: member.lastSeen || '',
          lastError: '',
          kind: member.role === 'hub' ? 'hub' : 'member',
        });
      }
      return views.sort((left, right) => left.label.localeCompare(right.label));
    }
    return peers.map((peer) => peerView(peer))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  /**
   * Build the panel snapshot, optionally only messages after a cursor.
   * @param {{sinceSeq?:number, limit?:number}} [input] - Paging.
   * @returns {object} Snapshot value.
   */
  function snapshot(input) {
    const since = input && Number.isFinite(input.sinceSeq) ? Math.max(0, Math.floor(input.sinceSeq)) : undefined;
    const limit = clampInt(input && input.limit, 1, 500, 200);
    const page = since === undefined
      ? events.slice(-limit)
      : events.filter((record) => record.seq > since).slice(0, limit);
    const urls = selfUrls();
    return {
      self: { id: nodeId, name: nodeName, version: VERSION },
      listen: { ...listenState },
      peers: deviceViews(),
      messages: page.map((record) => messageView(record, urls)),
      unread: unreadCount(),
      firstSeq,
      lastSeq: seq,
      cursor: page.length > 0 ? page[page.length - 1].seq : (since === undefined ? seq : since),
      lastSync,
      requests: requestStats(),
      reset: since !== undefined && since < firstSeq - 1,
      settings: {
        role: effectiveTransport() === 'mqtt' ? 'mqtt' : config.role,
        transport: effectiveTransport(),
        hubUrl: config.hubUrl,
        hubName: hubInfo && hubInfo.name ? hubInfo.name : '',
        mqttUrl: mqttSettings().url,
        mqttTopic: mqttSettings().topic,
        mqttStatus,
        mqttError,
        mqttSecretConfigured: Boolean(mqttSettings().secret),
        relay: config.relay,
        pollMs: config.pollMs,
        maxEvents: config.maxEvents,
        dataDir: config.dataDir,
        tokenConfigured: config.token.length > 0,
        executeRequests: config.executeRequests,
        allowedRequesters: config.allowedRequesters,
        remoteCwd: config.remoteCwd,
        requestTimeoutMs: config.requestTimeoutMs,
        fatalError: fatalError || '',
        rpcError: rpcError || '',
      },
    };
  }

  // -- lifecycle -----------------------------------------------------------

  /** Load state and start the configured transport. */
  async function start() {
    if (started) return;
    started = true;
    try {
      await loadState();
      await startTransport();
      schedulePersist();
    } catch (error) {
      recordFatal(error);
    }
  }

  /** Start whichever transport is currently effective. */
  async function startTransport() {
    if (effectiveTransport() === 'mqtt') {
      await startMqtt();
    } else {
      await startListener();
      schedulePoll();
    }
  }

  /** Close the current transport without touching stored messages or state. */
  async function stopTransport() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    if (mqttTransport) {
      const closing = mqttTransport;
      mqttTransport = null;
      try {
        await closing.stop();
      } catch {
        // Best effort on teardown.
      }
      mqttStatus = 'idle';
    }
    if (server) {
      const closing = server;
      server = null;
      if (typeof closing.closeAllConnections === 'function') closing.closeAllConnections();
      await new Promise((resolve) => closing.close(() => resolve()));
    }
    listenState.enabled = false;
    listenState.port = null;
    listenState.url = null;
  }

  /**
   * Switch the runtime transport from the panel and persist the choice.
   * @param {{transport?:string,mqttUrl?:string,mqttTopic?:string,mqttSecret?:string,mqttUsername?:string,mqttPassword?:string}} input - New settings.
   * @returns {Promise<{transport:string,mqttStatus:string,mqttError:string}>} Applied state.
   */
  async function configureTransport(input) {
    const mode = input && input.transport === 'mqtt' ? 'mqtt' : 'http';
    if (mode === 'http') {
      transportOverride = { transport: 'http' };
    } else {
      const url = clampText(input && input.mqttUrl, 500);
      const topic = clampText(input && input.mqttTopic, 200);
      const secret = typeof (input && input.mqttSecret) === 'string' ? input.mqttSecret : '';
      if (!/^(mqtts?|wss?):\/\//i.test(url)) {
        throw new InterflowError('invalid_mqtt_url', 'MQTT broker URL must start with mqtt://, mqtts://, ws://, or wss://.');
      }
      if (!topic) throw new InterflowError('invalid_mqtt_topic', 'MQTT room name is required.');
      if (!(secret || config.mqttSecret || config.token)) {
        throw new InterflowError('mqtt_secret_required', 'A shared secret is required (mqttSecret or token).');
      }
      transportOverride = {
        transport: 'mqtt',
        mqttUrl: url,
        mqttTopic: topic,
        mqttSecret: secret,
        mqttUsername: clampText(input && input.mqttUsername, 200),
        mqttPassword: typeof (input && input.mqttPassword) === 'string' ? input.mqttPassword : '',
      };
    }
    schedulePersist();
    await stopTransport();
    await startTransport();
    return { transport: effectiveTransport(), mqttStatus, mqttError };
  }

  /**
   * Connect the optional MQTT bridge. The HTTP listener and peer pull loop stay
   * off in this mode; messages arrive through the broker subscription.
   * @returns {Promise<void>} Resolves once the client is created.
   */
  async function startMqtt() {
    const settings = mqttSettings();
    if (!settings.url) throw new Error('MQTT transport requires mqttUrl.');
    if (!settings.topic) throw new Error('MQTT transport requires mqttTopic.');
    if (!settings.secret) {
      throw new Error('MQTT transport requires a shared secret (token or mqttSecret).');
    }
    mqttStatus = 'connecting';
    mqttError = '';
    mqttTransport = createMqttTransport({
      url: settings.url,
      topic: settings.topic,
      username: settings.username,
      password: settings.password,
      secret: settings.secret,
      nodeId,
      nodeName,
      presenceIntervalMs: Math.max(15000, config.pollMs * 5),
      onEvent: (event) => {
        ingestRemote(event);
      },
      onMembers: (members) => {
        mqttMembers = members;
      },
      onStatus: (status) => {
        mqttStatus = status;
        if (status === 'connected') mqttError = '';
      },
      onError: (error) => {
        mqttError = error instanceof Error ? error.message : String(error);
      },
    });
    await mqttTransport.start();
  }

  /** Persist and close the listener/transport. */
  async function stop() {
    stopped = true;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    await stopTransport();
    await writeChain.catch(() => {});
    await persist().catch(() => {});
  }

  return {
    start,
    stop,
    recordFatal,
    recordRpcError,
    sendMessage,
    requestRemote,
    configureTransport,
    addPeer,
    removePeer,
    markRead,
    snapshot,
    syncAll,
    inbox: inboxView,
    peersView,
  };

  /**
   * Inbox read model for the agent tool.
   * @param {{limit?:number, unreadOnly?:boolean, from?:string, markRead?:boolean, id?:string}} input - Query.
   * @returns {Promise<{unread:number,messages:object[]}>} Bounded messages.
   */
  async function inboxView(input) {
    const options = input && typeof input === 'object' ? input : {};
    const id = clampText(options.id, 120);
    if (id) {
      const record = events.find((candidate) => candidate.event.id === id);
      if (!record) throw new InterflowError('message_not_found', `No message has id ${id}.`);
      return { unread: unreadCount(), messages: [messageView(record)] };
    }
    const limit = clampInt(options.limit, 1, 20, 10);
    const from = clampText(options.from, 80).toLowerCase();
    const urls = selfUrls();
    const messages = events
      .filter((record) => record.event.origin !== nodeId)
      .filter((record) => isForMe(record.event, urls))
      .filter((record) => (options.unreadOnly === true ? !readIds.has(record.event.id) : true))
      .filter((record) => (from
        ? record.event.originName.toLowerCase().includes(from) || record.event.origin.toLowerCase().includes(from)
        : true))
      .slice(-limit)
      .reverse()
      .map((record) => {
        const view = messageView(record, urls);
        const truncated = view.body.length > 800;
        return { ...view, body: truncated ? view.body.slice(0, 800) : view.body, truncated };
      });
    if (options.markRead !== false) {
      for (const message of messages) readIds.add(message.id);
      if (messages.length > 0) schedulePersist();
    }
    return { unread: unreadCount(), messages };
  }

  /**
   * Peer read model for the agent tool.
   * @returns {{self:object,peers:object[],listen:object}} Peer summary.
   */
  function peersView() {
    return {
      self: {
        id: nodeId,
        name: nodeName,
        role: effectiveTransport() === 'mqtt' ? 'mqtt' : config.role,
        transport: effectiveTransport(),
        hubUrl: config.hubUrl,
        mqttUrl: mqttSettings().url,
        mqttTopic: mqttSettings().topic,
        mqttStatus,
        url: listenState.url || '',
        listening: listenState.enabled,
        error: mqttError || rpcError || fatalError || listenState.error || '',
      },
      peers: deviceViews(),
    };
  }
}

// ---------------------------------------------------------------------------
// Agent tools
// ---------------------------------------------------------------------------

const SEND_DESCRIPTION = 'Send a message to another DSH instance on the interflow mesh. The message is stored locally first, so an offline peer receives it when it syncs again. Use `*` to broadcast to every peer.';

const INBOX_DESCRIPTION = 'Read messages this DSH instance received from interflow peers, newest first. Bodies are truncated unless `id` names one message. Reading marks messages read unless markRead is false.';

const PEERS_DESCRIPTION = "List this instance's interflow address, listening state, and each configured peer with online state and last error.";

const CONNECT_DESCRIPTION = 'Add or remove a DSH peer by URL. Both instances need this plugin; across machines they also need the same shared token. Adding a peer lets both instances exchange messages on the next sync.';

const REQUEST_DESCRIPTION = 'Ask one other DSH instance to execute a task with its local tools and return the result. The request waits in the mailbox until that device is online; its answer arrives later as a message correlated by replyTo. The target must have executeRequests enabled.';

const ERROR_PROPERTIES = {
  error: {
    type: 'object',
    additionalProperties: false,
    properties: {
      code: { type: 'string', description: 'Stable failure code.' },
      message: { type: 'string', description: 'Human-readable explanation.' },
    },
  },
};

const SEND_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    id: { type: 'string' },
    to: { type: 'string' },
    toLabel: { type: 'string' },
    queued: { type: 'number' },
    ...ERROR_PROPERTIES,
  },
};

const INBOX_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    unread: { type: 'number' },
    messages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          seq: { type: 'number' },
          id: { type: 'string' },
          ts: { type: 'string' },
          kind: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
          truncated: { type: 'boolean' },
          replyTo: { type: 'string' },
          to: { type: 'string' },
          toLabel: { type: 'string' },
          from: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          mine: { type: 'boolean' },
          forMe: { type: 'boolean' },
          read: { type: 'boolean' },
        },
      },
    },
    ...ERROR_PROPERTIES,
  },
};

const PEERS_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    self: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string' },
        transport: { type: 'string' },
        hubUrl: { type: 'string' },
        mqttUrl: { type: 'string' },
        mqttTopic: { type: 'string' },
        mqttStatus: { type: 'string' },
        url: { type: 'string' },
        listening: { type: 'boolean' },
        error: { type: 'string' },
      },
    },
    peers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          url: { type: 'string' },
          nodeName: { type: 'string' },
          nodeId: { type: 'string' },
          kind: { type: 'string' },
          online: { type: 'boolean' },
          lastSeen: { type: 'string' },
          lastError: { type: 'string' },
        },
      },
    },
    ...ERROR_PROPERTIES,
  },
};

const CONNECT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean' },
    added: { type: 'boolean' },
    removed: { type: 'boolean' },
    url: { type: 'string' },
    peer: {
      type: 'object',
      additionalProperties: false,
      properties: {
        label: { type: 'string' },
        url: { type: 'string' },
        nodeName: { type: 'string' },
        nodeId: { type: 'string' },
        online: { type: 'boolean' },
        lastSeen: { type: 'string' },
        lastError: { type: 'string' },
      },
    },
    ...ERROR_PROPERTIES,
  },
};

const PARAMETER_SCHEMAS = {
  send: {
    type: 'object',
    additionalProperties: false,
    required: ['to', 'body'],
    properties: {
      to: {
        type: 'string',
        description: "Peer label, node name, node id, or URL; `*` broadcasts to every peer.",
      },
      subject: { type: 'string', description: 'Short summary shown in the inbox list, at most 200 characters.' },
      body: { type: 'string', description: 'Message text, at most 16000 characters.' },
      kind: { type: 'string', description: 'Message category: note, alert, question, answer, handoff, or request. Defaults to note.' },
      replyTo: { type: 'string', description: 'Id of the message being answered, when this is a reply.' },
    },
  },
  request: {
    type: 'object',
    additionalProperties: false,
    required: ['to', 'body'],
    properties: {
      to: {
        type: 'string',
        description: 'One target device: label, node name, node id, or URL. Broadcast is not allowed.',
      },
      subject: { type: 'string', description: 'Short task summary, at most 200 characters.' },
      body: { type: 'string', description: 'The task for the other DSH instance to execute, at most 16000 characters.' },
    },
  },
  inbox: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string', description: 'Exact message id; returns that message with its full body.' },
      limit: { type: 'number', description: 'Maximum messages to return, 1-20; defaults to 10.' },
      unreadOnly: { type: 'boolean', description: 'Return only unread messages.' },
      from: { type: 'string', description: 'Only messages whose sender name or node id contains this text.' },
      markRead: { type: 'boolean', description: 'Mark the returned messages read; defaults to true.' },
    },
  },
  peers: { type: 'object', additionalProperties: false, properties: {} },
  connect: {
    type: 'object',
    additionalProperties: false,
    required: ['url'],
    properties: {
      url: { type: 'string', description: 'Peer origin such as http://192.168.1.23:47810.' },
      label: { type: 'string', description: 'Display name for the peer in this instance.' },
      token: { type: 'string', description: 'Shared token when the peer listens beyond loopback.' },
      remove: { type: 'boolean', description: 'Remove the peer with this URL instead of adding it.' },
    },
  },
};

/**
 * Project one tool value as the single text block the model reads.
 * @param {unknown} value - Canonical tool value.
 * @returns {Array<{type:'text', text:string}>} Model content.
 */
function renderJson(_args, value) {
  return [{ type: 'text', text: JSON.stringify(value) }];
}

/**
 * Wrap one engine operation as a tool value, translating expected failures.
 * @param {(args:object)=>Promise<object>} run - Operation.
 * @param {object} args - Tool arguments.
 * @returns {Promise<object>} Canonical tool value.
 */
async function runTool(run, args) {
  try {
    const value = await run(args || {});
    return { ok: true, ...value };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error && error.code ? String(error.code) : 'internal_error',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Register the four interflow tools on a context.
 * @param {object} ctx - Context whose tool registry receives them.
 * @param {object} engine - Messaging engine.
 */
function registerTools(ctx, engine) {
  ctx.tools.register({
    name: 'interflow_send',
    description: SEND_DESCRIPTION,
    parameters: PARAMETER_SCHEMAS.send,
    output: { schema: SEND_OUTPUT_SCHEMA, render: renderJson },
    execute: (args) => runTool((input) => engine.sendMessage(input), args),
  });
  ctx.tools.register({
    name: 'interflow_request',
    description: REQUEST_DESCRIPTION,
    parameters: PARAMETER_SCHEMAS.request,
    output: { schema: SEND_OUTPUT_SCHEMA, render: renderJson },
    execute: (args) => runTool((input) => engine.requestRemote(input), args),
  });
  ctx.tools.register({
    name: 'interflow_inbox',
    description: INBOX_DESCRIPTION,
    parameters: PARAMETER_SCHEMAS.inbox,
    output: { schema: INBOX_OUTPUT_SCHEMA, render: renderJson },
    execute: (args) => runTool((input) => engine.inbox(input), args),
  });
  ctx.tools.register({
    name: 'interflow_peers',
    description: PEERS_DESCRIPTION,
    parameters: PARAMETER_SCHEMAS.peers,
    output: { schema: PEERS_OUTPUT_SCHEMA, render: renderJson },
    execute: (args) => runTool(() => Promise.resolve(engine.peersView()), args),
  });
  ctx.tools.register({
    name: 'interflow_connect',
    description: CONNECT_DESCRIPTION,
    parameters: PARAMETER_SCHEMAS.connect,
    output: { schema: CONNECT_OUTPUT_SCHEMA, render: renderJson },
    execute: (args) => runTool(async (input) => {
      if (input.remove === true) return { ...(await engine.removePeer(input)), removed: true };
      return { ...(await engine.addPeer(input)), added: true };
    }, args),
  });
}

// ---------------------------------------------------------------------------
// Browser route
// ---------------------------------------------------------------------------

/**
 * Handle one authenticated owner-browser panel request on `/api/interflow`.
 * The shared `/api` carrier has already applied the Host/Origin fence and the
 * browser credential before this handler runs.
 * @param {Request} request - Fetch request.
 * @param {object} engine - Messaging engine.
 * @returns {Promise<Response>} JSON response.
 */
async function handlePanelRequest(request, engine) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(fail('bad_request', 'Request body must be JSON.'), { status: 400 });
  }
  const op = body && typeof body.op === 'string' ? body.op : '';
  const payload = body && body.payload && typeof body.payload === 'object' ? body.payload : {};
  try {
    switch (op) {
      case 'snapshot':
        return Response.json({ ok: true, value: engine.snapshot(payload) });
      case 'send':
        return Response.json({ ok: true, value: await engine.sendMessage(payload) });
      case 'addPeer':
        return Response.json({ ok: true, value: await engine.addPeer(payload) });
      case 'removePeer':
        return Response.json({ ok: true, value: await engine.removePeer(payload) });
      case 'markRead':
        return Response.json({ ok: true, value: await engine.markRead(payload) });
      case 'sync':
        await engine.syncAll();
        return Response.json({ ok: true, value: engine.snapshot({}) });
      case 'inbox':
        return Response.json({ ok: true, value: await engine.inbox(payload) });
      case 'configureTransport':
        return Response.json({ ok: true, value: await engine.configureTransport(payload) });
      default:
        return Response.json(fail('unknown_operation', `Unknown interflow operation "${op}".`));
    }
  } catch (error) {
    return Response.json(fail(
      error && error.code ? String(error.code) : 'internal_error',
      error instanceof Error ? error.message : String(error),
    ));
  }
}

/**
 * Build one failure envelope for the panel route.
 * @param {string} code - Stable code.
 * @param {string} message - Explanation.
 * @returns {object} Failure envelope.
 */
function fail(code, message) {
  return { ok: false, error: { code, message, details: {} } };
}
