# Third-party notices

`mqtt-bundle.cjs` is a generated bundle of [`mqtt`](https://github.com/mqttjs/MQTT.js) 5.16.1 and its dependency tree, produced with esbuild.

- `mqtt` is licensed under the MIT License. Its license text is in `node_modules/mqtt/LICENSE.md` in a development checkout.
- The bundled dependencies (including `mqtt-packet`, `readable-stream`, `ws`, `debug`, `socks`, `worker-timers`, and their transitive packages) retain their respective upstream licenses. Their license comments are preserved in the generated bundle where esbuild could retain them.
- The bundle is generated locally and is not a modification of the upstream source beyond bundling.

If you redistribute this plugin, keep this notice and the upstream license terms with it.
