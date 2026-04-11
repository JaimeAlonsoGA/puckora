import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const dotenv = require('dotenv');
dotenv.config({ path: 'apps/web/.env.local' });
dotenv.config({ path: '.env.local' });

const { Pool } = require('pg');
const sql = readFileSync('packages/db/sql/product_financials_view.sql', 'utf8');

// Only apply the DROP VIEW + CREATE VIEW + COMMENT — skip ALTER TABLE (already exists)
const viewStart = sql.indexOf('drop view if exists');
const viewSql = sql.slice(viewStart);

// Split into: drop, create view, comment
// The create view is one big statement ending before "comment on view"
const commentIdx = viewSql.indexOf('\ncomment on view');
const dropAndCreate = viewSql.slice(0, commentIdx).trim();
const commentStmt = viewSql.slice(commentIdx).trim();

const stmts = [dropAndCreate, commentStmt].filter(Boolean);

const pool = new Pool({ connectionString: process.env.DATABASE_PROXY_URL, connectionTimeoutMillis: 10000 });

async function run() {
    const client = await pool.connect();
    try {
        for (const stmt of stmts) {
            const preview = stmt.slice(0, 80).replace(/\n/g, ' ');
            process.stdout.write(`  → ${preview}...\n`);
            await client.query(stmt);
            process.stdout.write('    ✓\n');
        }
        console.log('\n✓ product_financials view applied successfully');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(e => {
    console.error('✗ Error:', e.message);
    process.exit(1);
});
