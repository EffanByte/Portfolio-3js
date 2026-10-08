const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const cli = path.join(process.env.APPDATA, 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js');

(async () => {
  if (process.argv[2] === 'schemas') {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-figma-schema-'));
    execFileSync(process.execPath, [cli, 'app-server', 'generate-json-schema', '--experimental', '--out', directory], { windowsHide: true, stdio: 'pipe' });
    async function inspect(folder) {
      for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) await inspect(file);
        else if (/^(Mcp.*Params|ListMcp.*Params)\.json$/.test(entry.name)) {
          const schema = JSON.parse(await fs.readFile(file, 'utf8'));
          console.log(entry.name, JSON.stringify({properties:schema.properties,required:schema.required}));
        }
      }
    }
    await inspect(directory);
    return;
  }

  const server = spawn(process.execPath, [cli, 'app-server'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = readline.createInterface({ input: server.stdout });
  const pending = new Map();
  let requestId = 0;
  function request(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 45000);
      pending.set(id, { resolve, reject, timer });
      server.stdin.write(JSON.stringify({ id, method, params }) + '\n');
    });
  }
  lines.on('line', line => {
    try {
      const message = JSON.parse(line);
      const callback = pending.get(message.id);
      if (callback) {
        clearTimeout(callback.timer);
        pending.delete(message.id);
        if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
        else callback.resolve(message.result);
      }
      if (message.method && message.id) console.log('SERVER_REQUEST', JSON.stringify(message));
    } catch {}
  });
  server.stderr.on('data', () => {});
  try {
    await request('initialize', { clientInfo: { name: 'portfolio_figma_setup', title: 'Portfolio Figma Setup', version: '1.0' }, capabilities: { experimentalApi: true } });
    server.stdin.write(JSON.stringify({ method: 'initialized', params: {} }) + '\n');
    const status = await request('mcpServerStatus/list', { limit: 100 });
    const figma = status.data?.find(item => item.name === 'figma');
    if (!figma) throw new Error('Figma was not returned by the MCP server status request.');
    await fs.writeFile('scripts/figma-tools.json', JSON.stringify({ authStatus:figma.authStatus, tools:figma.tools, resources:figma.resources }, null, 2));
    console.log('Figma connection:', figma.authStatus, 'Tools:', Object.keys(figma.tools));
    const input = readline.createInterface({ input: process.stdin });
    for await (const line of input) {
      try {
        const command = JSON.parse(line);
        if (command.method === 'exit') break;
        console.log('RESULT', JSON.stringify(await request(command.method, command.params)));
      } catch (error) { console.log('ERROR', error.message); }
    }
  } finally {
    lines.close();
    server.stdin.end();
    server.kill();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
