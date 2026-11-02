/**
 * Standalone fake interflow peer for wire-level verification.
 * Holds state in memory so it needs no filesystem access.
 * Not part of the shipped bundle.
 */
import http from 'node:http';

const PORT = 47991;
const received = [];
const MESSAGE = {
  id: 'fake-peer-broadcast-1',
  ts: new Date().toISOString(),
  origin: 'fake-peer-node',
  originName: 'Fake peer',
  to: '*',
  kind: 'alert',
  subject: 'Wire check from fake peer',
  body: 'This message proves pull ingestion works.',
  replyTo: null,
};

let served = false;

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://fake');
  const json = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'GET' && url.pathname === '/log') {
    const since = Number(url.searchParams.get('since') || 0);
    const events = !served && since < 1 ? [{ seq: 1, event: MESSAGE }] : [];
    if (events.length > 0) served = true;
    json(200, {
      ok: true,
      node: { id: 'fake-peer-node', name: 'Fake peer' },
      firstSeq: 1,
      lastSeq: 1,
      reset: false,
      events,
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/ingest') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}');
      for (const event of parsed.events || []) received.push(event);
      json(200, { ok: true, accepted: (parsed.events || []).length, lastSeq: 1 });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/received') {
    json(200, { ok: true, received });
    return;
  }
  json(404, { ok: false });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`fake peer on http://127.0.0.1:${PORT}`);
});
