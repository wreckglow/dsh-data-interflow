/**
 * Test EMQX File Transfer (upload to the broker, download via the REST API).
 *
 * Required environment:
 *   EMQX_MQTT_URL      e.g. mqtt://mysvip.fun:1883
 *   EMQX_USERNAME      broker username
 *   EMQX_PASSWORD      broker password
 *   EMQX_API_URL       e.g. http://mysvip.fun:18083
 *   EMQX_API_KEY       global EMQX API key
 *   EMQX_API_SECRET    global EMQX API secret
 *
 * Optional:
 *   EMQX_FILE          file to upload (default: a temporary text file)
 *   EMQX_FILE_NAME     name shown by EMQX (default: basename)
 *   EMQX_SEGMENTS_TTL  seconds, 60-86400 (default: 600)
 *
 * This is deliberately standalone: it uses the bundled MQTT client and the
 * EMQX REST API, so it proves the B path before wiring it into the plugin.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mqtt = require('./mqtt-bundle.cjs');

const mqttUrl = process.env.EMQX_MQTT_URL;
const apiUrl = process.env.EMQX_API_URL;
const apiKey = process.env.EMQX_API_KEY;
const apiSecret = process.env.EMQX_API_SECRET;
const username = process.env.EMQX_USERNAME || '';
const password = process.env.EMQX_PASSWORD || '';
const segmentsTtl = Math.max(60, Math.min(Number(process.env.EMQX_SEGMENTS_TTL) || 600, 86400));

if (!mqttUrl || !apiUrl || !apiKey || !apiSecret) {
  console.error('Set EMQX_MQTT_URL, EMQX_API_URL, EMQX_API_KEY and EMQX_API_SECRET.');
  process.exit(1);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ifx-emqx-ft-'));
const created = !process.env.EMQX_FILE;
const filePath = process.env.EMQX_FILE || path.join(tempRoot, 'ifx-test.txt');
if (created) fs.writeFileSync(filePath, `interflow emqx file transfer test ${new Date().toISOString()}\n`);
const name = process.env.EMQX_FILE_NAME || path.basename(filePath);
const data = fs.readFileSync(filePath);
const sha = crypto.createHash('sha256').update(data).digest('hex');
const fileId = `ifx-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
const clientId = process.env.EMQX_CLIENT_ID || `ifx-ft-${crypto.randomBytes(4).toString('hex')}`;
const chunkSize = Number(process.env.EMQX_CHUNK_SIZE) || 64 * 1024;
const apiAuth = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;

const client = mqtt.connect(mqttUrl, {
  clientId,
  protocolVersion: 5,
  username: username || undefined,
  password: password || undefined,
  reconnectPeriod: 0,
  connectTimeout: 15000,
});

client.on('error', (error) => console.error('mqtt error:', error.message));

function publish(topic, payload, options = {}) {
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1, ...options }, (error, packet) => {
      if (error) {
        reject(error);
        return;
      }
      if (packet && typeof packet.reasonCode === 'number' && packet.reasonCode >= 128) {
        reject(new Error(`EMQX rejected ${topic}: reason ${packet.reasonCode} ${packet.reasonString || ''}`));
        return;
      }
      resolve(packet);
    });
  });
}

async function main() {
  console.log('connecting', mqttUrl, 'clientId', clientId);
  await once(client, 'connect');
  console.log('mqtt connected; uploading', filePath, data.length, 'bytes');

  await publish(`$file/${fileId}/init`, JSON.stringify({
    name,
    size: data.length,
    checksum: sha,
    segments_ttl: segmentsTtl,
    expire_at: Math.floor(Date.now() / 1000) + segmentsTtl,
  }));
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunk = data.subarray(offset, Math.min(offset + chunkSize, data.length));
    await publish(`$file/${fileId}/${offset}`, chunk);
    process.stdout.write(`\ruploaded ${Math.min(offset + chunkSize, data.length)}/${data.length}`);
  }
  await publish(`$file/${fileId}/fin/${data.length}/${sha}`, Buffer.alloc(0));
  process.stdout.write('\n');
  console.log('fin sent; waiting for EMQX to assemble');

  let entry = null;
  let files = [];
  for (let attempt = 0; attempt < 20 && !entry; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const listResponse = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v5/file_transfer/files`, {
      headers: { authorization: apiAuth },
    });
    if (!listResponse.ok) {
      throw new Error(`GET /file_transfer/files -> ${listResponse.status} ${await listResponse.text()}`);
    }
    const list = await listResponse.json();
    files = Array.isArray(list.files) ? list.files : [];
    entry = files.find((file) => file.fileid === fileId)
      || files.find((file) => file.name === name && file.clientid === clientId)
      || null;
  }
  if (!entry) {
    console.error('uploaded file not listed; current files:', files.map((file) => ({
      fileid: file.fileid,
      clientid: file.clientid,
      name: file.name,
      size: file.size,
    })));
    throw new Error('EMQX file transfer did not list the uploaded file; is file_transfer.enable true?');
  }
  console.log('listed:', JSON.stringify(entry));

  const downloadUrl = /^https?:/i.test(entry.uri)
    ? entry.uri
    : new URL(entry.uri, apiUrl).toString();
  const downloadHeaders = /^https?:/i.test(entry.uri) ? {} : { authorization: apiAuth };
  const downloadResponse = await fetch(downloadUrl, { headers: downloadHeaders });
  if (!downloadResponse.ok) {
    throw new Error(`download -> ${downloadResponse.status} ${await downloadResponse.text()}`);
  }
  const downloaded = Buffer.from(await downloadResponse.arrayBuffer());
  const downloadedSha = crypto.createHash('sha256').update(downloaded).digest('hex');
  const target = path.join(tempRoot, `downloaded-${name}`);
  fs.writeFileSync(target, downloaded);

  console.log('downloaded bytes:', downloaded.length);
  console.log('sha256 expected:', sha);
  console.log('sha256 actual:  ', downloadedSha);
  console.log('saved:', target);
  if (downloadedSha !== sha) throw new Error('checksum mismatch');
  console.log('EMQX file transfer test OK');
}

try {
  await main();
} finally {
  client.end(true);
  if (created) {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  }
}
