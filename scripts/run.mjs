import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const task = process.argv[2];
if (!['build', 'test', 'typecheck', 'lint'].includes(task)) throw new Error('Unknown task');
if (!process.env.npm_execpath) throw new Error('Use npm run to execute this command.');
for (const folder of ['frontend', 'backend']) {
  const args = [process.env.npm_execpath, 'run', task];
  // Unit tests are safe by default. Live database integration is a separate opt-in command.
  if (folder === 'backend' && task === 'test') args.push('--', 'tests/unit.test.ts');
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: join(root, folder), stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', resolve);
  });
  if (code !== 0) { process.exitCode = code || 1; break; }
}
