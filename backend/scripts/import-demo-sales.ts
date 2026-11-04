import { importDemoSales } from '../src/db/demoSales.js';
import { client } from '../src/db/index.js';

try { await importDemoSales(process.argv.includes('--sync-profiles') || process.argv.includes('--update-names') ? 'profiles' : process.argv.includes('--apply') ? 'apply' : process.argv.includes('--check') ? 'check' : 'preview'); }
finally { await client.end({ timeout: 5 }); }
