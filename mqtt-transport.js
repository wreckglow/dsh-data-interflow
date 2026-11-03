/**
 * Optional MQTT transport for Interflow.
 *
 * The broker is only a rendezvous: every payload is sealed with AES-256-GCM
 * using a key derived from the shared secret, so a public broker sees topics
 * and ciphertext, never message content. Devices announce themselves on a
 * retained presence topic; direct messages go to `.../msg/<nodeId>` and
 * broadcast messages to `.../broadcast`.
 */

import crypto from 'node:crypto';

/**
 * Derive the 32-byte AES key from the shared secret.
 * @param {string} secret - Shared secret.
 * @returns {Buffer} 32-byte key.
 */
export function deriveKey(secret) {
  return crypto.createHash('sha256').update(String(secret), 'utf8').digest();
}

/**
 * Seal one JSON value.
 * @param {string} secret - Shared secret.
 * @param {unknown} value - JSON value.
 * @returns {string} Envelope text safe for an MQTT payload.
 */
export function sealMessage(secret, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: body.toString('base64'),
  });
}

/**
 * Open one sealed envelope.
 * @param {string} secret - Shared secret.
 * @param {string} text - Envelope text.
 * @returns {unknown} Decoded value.
 * @throws {Error} On a malformed or unauthenticated envelope.
 */
export function openMessage(secret, text) {
  const envelope = JSON.parse(String(text));
  if (!envelope || envelope.v !== 1 || typeof envelope.iv !== 'string'
    || typeof envelope.tag !== 'string' || typeof envelope.data !== 'string') {
    throw new Error('invalid interflow envelope');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(secret), Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const body = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(body.toString('utf8'));
}

/**
 * Normalize the topic namespace.
 * @param {unknown} topic - Configured namespace.
 * @returns {string} Trimmed namespace without wildcards.
 */
function normalizeTopic(topic) {
  const text = String(topic || '').trim().replace(/^\/+|\/+$/g, '');
  if (!text) throw new Error('MQTT transport requires mqttTopic.');
  if (text.includes('+') || text.includes('#')) throw new Error('mqttTopic must not contain MQTT wildcards.');
  return text;
}

/** @returns {string} Current ISO timestamp. */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Load the MQTT client. Prefer the bundled copy so a Host that cannot resolve
 * third-party bare specifiers (some DSH builds) still gets MQTT; fall back to
 * the installed `mqtt` package for older installs that lack the bundle.
 * @returns {Promise<Function>} `mqtt.connect`.
 */
async function loadMqttConnect() {
  let module;
  try {
    module = await import('./mqtt-bundle.cjs');
  } catch (bundleError) {
    try {
      module = await import('mqtt');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const bundled = bundleError instanceof Error ? bundleError.message : String(bundleError);
      throw new Error(`The MQTT transport could not load its bundled client or the "mqtt" package (bundle: ${bundled}; package: ${detail}).`);
    }
  }
  const mqtt = module && module.default && typeof module.default.connect === 'function'
    ? module.default
    : module;
  if (!mqtt || typeof mqtt.connect !== 'function') throw new Error('The installed "mqtt" package exposes no connect().');
  return mqtt.connect;
}

/**
 * Create an MQTT bridge for one device.
 * @param {object} options - Transport wiring.
 * @param {string} options.url - Broker URL, e.g. `wss://broker.emqx.io:8084/mqtt`.
 * @param {string} options.topic - Shared namespace, e.g. `interflow-home`.
 * @param {string} options.secret - Shared secret used for AES-256-GCM.
 * @param {string} options.nodeId - Stable device id.
 * @param {string} options.nodeName - Display name.
 * @param {string} [options.username] - Broker username.
 * @param {string} [options.password] - Broker password.
 * @param {Function} [options.clientFactory] - Test seam: `(url, options) => client`.
 * @param {(event: object) => void} [options.onEvent] - Decrypted message event.
 * @param {(members: object[]) => void} [options.onMembers] - Presence changes.
 * @param {(status: string) => void} [options.onStatus] - Connection state.
 * @param {(error: Error) => void} [options.onError] - Transport failures.
 * @param {number} [options.presenceIntervalMs] - Presence refresh period.
 * @returns {object} Transport API.
 */
export function createMqttTransport(options) {
  const secret = String(options.secret || '');
  if (!secret) throw new Error('The MQTT transport requires a shared secret (token or mqttSecret).');
  const base = normalizeTopic(options.topic);
  const nodeId = String(options.nodeId);
  const nodeName = String(options.nodeName || nodeId);
  const directTopic = `${base}/msg/${nodeId}`;
  const broadcastTopic = `${base}/broadcast`;
  const presenceTopic = `${base}/presence/${nodeId}`;
  const presencePattern = `${base}/presence/+`;
  const presenceIntervalMs = Number.isFinite(options.presenceIntervalMs) && options.presenceIntervalMs >= 5000
    ? Math.floor(options.presenceIntervalMs)
    : 30000;

  /** @type {Map<string,{id:string,name:string,online:boolean,lastSeen:string}>} */
  const members = new Map();
  let client = null;
  let started = false;
  let status = 'idle';
  let presenceTimer = null;

  const reportStatus = (next) => {
    if (status === next) return;
    status = next;
    if (typeof options.onStatus === 'function') options.onStatus(next);
  };
  const reportMembers = () => {
    if (typeof options.onMembers === 'function') {
      options.onMembers([...members.values()]);
    }
  };
  const reportError = (error) => {
    if (typeof options.onError === 'function') options.onError(error instanceof Error ? error : new Error(String(error)));
  };

  /**
   * Publish this device's presence.
   * @param {boolean} online - Whether the device is online.
   */
  function publishPresence(online) {
    if (!client) return;
    const payload = sealMessage(secret, {
      id: nodeId,
      name: nodeName,
      online,
      ts: nowIso(),
    });
    client.publish(presenceTopic, payload, { qos: 1, retain: true }, (error) => {
      if (error) reportError(error);
    });
  }

  /**
   * Handle one broker message.
   * @param {string} topic - Message topic.
   * @param {Buffer|string} payload - Sealed payload.
   */
  function onMessage(topic, payload) {
    let value;
    try {
      value = openMessage(secret, Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload));
    } catch {
      return;
    }
    if (topic.startsWith(`${base}/presence/`)) {
      if (!value || typeof value.id !== 'string' || value.id === nodeId) return;
      members.set(value.id, {
        id: value.id,
        name: typeof value.name === 'string' && value.name ? value.name : value.id.slice(0, 8),
        online: value.online !== false,
        lastSeen: typeof value.ts === 'string' ? value.ts : nowIso(),
      });
      reportMembers();
      return;
    }
    if (topic !== directTopic && topic !== broadcastTopic) return;
    if (!value || typeof value.id !== 'string' || typeof value.origin !== 'string') return;
    if (typeof options.onEvent === 'function') options.onEvent(value);
  }

  /** Subscribe and announce presence after a successful connect. */
  function onConnect() {
    reportStatus('connected');
    client.subscribe([directTopic, broadcastTopic, presencePattern], { qos: 1 }, (error) => {
      if (error) reportError(error);
    });
    publishPresence(true);
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(() => publishPresence(true), presenceIntervalMs);
    if (typeof presenceTimer.unref === 'function') presenceTimer.unref();
  }

  return {
    /** Connect to the broker and start receiving. @returns {Promise<void>} */
    async start() {
      if (started) return;
      started = true;
      reportStatus('connecting');
      const factory = typeof options.clientFactory === 'function'
        ? options.clientFactory
        : await loadMqttConnect();
      const willPayload = sealMessage(secret, {
        id: nodeId,
        name: nodeName,
        online: false,
        ts: nowIso(),
      });
      client = factory(options.url, {
        clientId: `ifl-${String(nodeId).slice(0, 20)}`,
        clean: false,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
        keepalive: 30,
        ...(options.username ? { username: options.username } : {}),
        ...(options.password ? { password: options.password } : {}),
        will: { topic: presenceTopic, payload: willPayload, qos: 1, retain: true },
      });
      client.on('connect', onConnect);
      client.on('message', onMessage);
      client.on('error', (error) => {
        reportStatus('error');
        reportError(error);
      });
      client.on('close', () => reportStatus('disconnected'));
    },

    /**
     * Publish one event to its recipient or to everyone.
     * @param {object} event - Message event.
     * @returns {Promise<void>} Resolves after the broker accepts the publish.
     */
    publish(event) {
      if (!client) return Promise.reject(new Error('MQTT transport is not connected.'));
      const topic = event.to === '*' ? broadcastTopic : `${base}/msg/${event.to}`;
      return new Promise((resolve, reject) => {
        client.publish(topic, sealMessage(secret, event), { qos: 1, retain: false }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },

    /** Discovered devices, including offline retained presence. @returns {object[]} */
    getMembers() {
      return [...members.values()];
    },

    /** @returns {string} Connection state. */
    getStatus() {
      return status;
    },

    /** Disconnect and publish the offline presence. @returns {Promise<void>} */
    async stop() {
      started = false;
      if (presenceTimer) {
        clearInterval(presenceTimer);
        presenceTimer = null;
      }
      if (!client) return;
      const closing = client;
      try {
        closing.publish(presenceTopic, sealMessage(secret, {
          id: nodeId,
          name: nodeName,
          online: false,
          ts: nowIso(),
        }), { qos: 1, retain: true });
      } catch {
        // Best effort only.
      }
      client = null;
      await new Promise((resolve) => {
        try {
          closing.end(false, {}, () => resolve());
        } catch {
          resolve();
        }
      });
      reportStatus('closed');
    },
  };
}
