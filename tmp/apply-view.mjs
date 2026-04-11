import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const dotenv = require('dotenv');
dotenv.config({ path: 'apps/web/.env.local' });
dotenv.config({ path: '.env.local' });

const { Pool } = require('pg');
const sql = readFileSync('packages/db/sql/product_financials_view.sql', 'utf8');

// Split into individual statements — the view DDL has several top-level statements
const raw = sql
    .replace(/--[^\n]*/g, '') // strip line comments
    .split(/;\s*\n/) // split on semicolons followed by newline
    .map(s => s.trim())
    .filter(s => s.length > 0);

const pool = new Pool({ connectionString: process.env.DATABASE_PROXY_URL, connectionTimeoutMillis: 10000 });

async function run() {
    const client = await pool.connect();
    try {
        for (const stmt of raw) {
            const preview = stmt.slice(0, 80).replace(/\n/g, ' ');
            process.stdout.write(`  → ${preview}...\n`);
            await client.query(stmt);
        }
        console.log('\n✓ product_financials view applied successfully');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(e => {
    console.error('✗ Error:', e.message);
    pool.end();
    process.exit(1);
});
