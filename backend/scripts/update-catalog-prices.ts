// Explicit catalog maintenance: changes only prices for the 18 seed SKUs.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { client } from '../src/db/index.js';

try {
  const source = await readFile(new URL('../src/db/seed.ts', import.meta.url), 'utf8');
  const entries = [...source.matchAll(/sku: '(BD-(?:SLG|RNS|TTB)-\d{3})'[^\n]*?price: (\d+)/g)]
    .map(match => ({ sku: match[1], price: Number(match[2]) }));
  if (entries.length !== 18 || new Set(entries.map(row => row.sku)).size !== 18 || entries.some(row => row.price <= 0 || row.price % 10000 !== 0)) throw new Error('Expected 18 distinct catalog SKUs with positive round prices.');
  const directory = new URL('../uploads/catalog-import/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const changes = await client.begin(async tx => {
    const previous = [];
    for (const entry of entries) {
      const [row] = await tx`select id, sku, name, price, stock from products where sku=${entry.sku} for update`;
      if (!row) throw new Error(`Catalog product missing: ${entry.sku}`);
      previous.push({ ...row, newPrice: entry.price });
    }
    const backup = new URL(`prices-before-${new Date().toISOString().replaceAll(':', '-')}.json`, directory);
    await writeFile(backup, JSON.stringify(previous, null, 2));
    for (const row of previous) await tx`update products set price=${row.newPrice}, updated_at=clock_timestamp() where id=${row.id}`;
    return previous;
  });
  console.table(changes.map(row => ({ product: row.name, previousPrice: row.price, currentPrice: row.newPrice, stock: row.stock })));
  console.log('Updated 18 catalog prices. Stock and historical order/item/payment values were not changed. Previous prices backed up under backend/uploads/catalog-import/.');
} finally { await client.end({ timeout: 5 }); }
