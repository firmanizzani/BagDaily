import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const backendPort = process.env.PORT || '3000';
const frontendPort = process.env.FRONTEND_PORT || '5173';
const children = [];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
}
function start(folder, entry, args, env) {
  const child = spawn(process.execPath, [join(root, folder, entry), ...args], {
    cwd: join(root, folder), stdio: 'inherit', env: { ...process.env, ...env },
  });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(); process.exitCode = 1; });
  child.on('exit', code => { if (!stopping) { process.exitCode = code || 0; stop(); } });
}
console.log('\n  BagDaily · toko, admin, dan kasir\n');
console.log(`  ➜  App:     http://localhost:${frontendPort}/`);
console.log(`  ➜  API:     http://localhost:${backendPort}/`);
console.log('  Tekan Ctrl+C untuk menghentikan keduanya.\n');
start('backend', 'node_modules/tsx/dist/cli.mjs', ['watch', 'src/server.ts'], {
  PORT: backendPort,
  FRONTEND_URL: process.env.FRONTEND_URL || `http://localhost:${frontendPort}`,
});
start('frontend', 'node_modules/vite/bin/vite.js', ['--host', '0.0.0.0', '--port', frontendPort, '--strictPort'], {
  BAGDAILY_API_PROXY: `http://localhost:${backendPort}`,
});
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
