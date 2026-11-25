import http from 'node:http';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('./run.mjs', import.meta.url), 'utf8');
// reuse mocks from run.mjs: take everything before "const pend"
const pre = src.split('const pend')[0].replace("import worker from '../src/index.js';", "import worker from '../src/index.js';\nexport {};");
fs.writeFileSync(new URL('./_mock.mjs', import.meta.url), pre + '\nexport { worker, env };\n');
const { worker, env } = await import('./_mock.mjs');
http.createServer(async (req, res) => {
  const ch = []; for await (const c of req) ch.push(c);
  const r = new Request('http://localhost:8788' + req.url, { method: req.method, headers: req.headers, body: ch.length ? Buffer.concat(ch) : undefined });
  const o = await worker.fetch(r, env, { waitUntil() {} });
  res.writeHead(o.status, Object.fromEntries(o.headers)); res.end(Buffer.from(await o.arrayBuffer()));
}).listen(8788, () => console.log('up'));
