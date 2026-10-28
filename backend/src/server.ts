import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`\n  BagDaily API ready\n`);
  console.log(`  ➜  Local:   http://localhost:${env.PORT}/`);
  console.log(`  ➜  Health:  http://localhost:${env.PORT}/api/health\n`);
});
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
