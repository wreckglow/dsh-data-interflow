/**
 * Optional live broker smoke test (needs internet). Not part of the bundle.
 */
import mqtt from 'mqtt';

const url = process.env.IFX_MQTT_URL || 'wss://broker.emqx.io:8084/mqtt';
const topic = `interflow-live/${Math.random().toString(16).slice(2)}`;
const client = mqtt.connect(url, {
  clientId: `ifl-live-${Math.random().toString(16).slice(2, 12)}`,
  connectTimeout: 10000,
  reconnectPeriod: 0,
});

const fail = (message) => {
  console.error(message);
  try { client.end(true); } catch {}
  process.exit(1);
};

const timer = setTimeout(() => fail('timeout'), 20000);

client.on('connect', () => {
  client.subscribe(topic, { qos: 1 }, (error) => {
    if (error) return fail(`subscribe failed: ${error.message}`);
    client.publish(topic, 'hello over mqtt', { qos: 1 }, (publishError) => {
      if (publishError) fail(`publish failed: ${publishError.message}`);
    });
  });
});

client.on('message', (received, payload) => {
  if (received !== topic) return;
  console.log('received:', payload.toString());
  clearTimeout(timer);
  client.end(false, () => process.exit(0));
});

client.on('error', (error) => fail(`connect failed: ${error.message}`));
