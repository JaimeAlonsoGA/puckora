#!/usr/bin/env node

/**
 * Silkflow Embeddings Setup Script
 * 1. Import 25k+ Amazon categories from CSV using upsert_category_from_path()
 * 2. Generate OpenAI embeddings for all categories
 * 3. Verify semantic search is working
 *
 * Run once after migrations are deployed:
 *   node scripts/setup-embeddings.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ── Load .env ────────────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const matches = envContent.matchAll(/^([A-Z_]+)=([^\n]*(?:\n(?![A-Z_]+=)[^\n]*)*)/gm);
    for (const m of matches) {
        const key = m[1];
        const value = m[2].split("#")[0].replace(/\n/g, "").trim();
        if (!process.env[key] && value) process.env[key] = value;
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CSV_PATH = path.join(process.cwd(), "packages", "utils", "src", "AmazonCategories.csv");

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBED_BATCH_SIZE = 100;
const INSERT_BATCH_SIZE = 100;
const IMPORT_BATCH_SIZE = 50;

// ── Logging ──────────────────────────────────────────────────────────────────
const log = {
    header: (t) => console.log(`\n${"=".repeat(80)}\n${t}\n${"=".repeat(80)}`),
    ok: (t) => console.log(`  ✓ ${t}`),
    info: (t) => console.log(`  ℹ ${t}`),
    warn: (t) => console.log(`  ⚠ ${t}`),
    err: (t) => console.error(`  ✗ ${t}`),
};

// ── HTTP helpers ─────────────────────────────────────────────────────────────
function supaHeaders(extra = {}) {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        ...extra,
    };
}

async function supaFetch(method, endpoint, body, extra = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${endpoint}`, {
        method,
        headers: supaHeaders(extra),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${method} ${endpoint} → ${res.status}: ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function rpc(name, params) {
    return supaFetch("POST", `/rpc/${name}`, params);
}

// ── Step 1: Parse CSV ────────────────────────────────────────────────────────
async function parseCsv() {
    return new Promise((resolve, reject) => {
        const rows = [];
        let lineNum = 0;
        const rl = readline.createInterface({ input: fs.createReadStream(CSV_PATH), crlfDelay: Infinity });
        rl.on("line", (line) => {
            if (lineNum++ === 0) return;
            const parts = line.split(";").map((p) => p.trim()).filter(Boolean);
            if (parts.length === 0) return;
            rows.push({
                name: parts[parts.length - 1],
                fullPath: parts.join(" > "),
                depth: parts.length,
                parentPath: parts.length > 1 ? parts.slice(0, -1).join(" > ") : null,
            });
        });
        rl.on("close", () => resolve(rows));
        rl.on("error", reject);
    });
}

// ── Retry helper ─────────────────────────────────────────────────────────────
async function withRetry(fn, retries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try { return await fn(); }
        catch (e) {
            if (attempt === retries) throw e;
            log.warn(`Attempt ${attempt} failed (${e.message.substring(0, 80)}), retrying in ${delayMs}ms...`);
            await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
    }
}

// ── Step 2: Import categories via RPC ────────────────────────────────────────
async function importCategories() {
    log.header("STEP 1: Importing Amazon Categories from CSV");
    log.info("Parsing CSV...");
    const rows = await parseCsv();
    log.ok(`Parsed ${rows.length} rows`);

    // Sort by depth ascending so parents are always inserted before children.
    rows.sort((a, b) => a.depth - b.depth);

    // Group by depth so we can await each depth level fully before proceeding.
    const byDepth = new Map();
    for (const row of rows) {
        if (!byDepth.has(row.depth)) byDepth.set(row.depth, []);
        byDepth.get(row.depth).push(row);
    }
    const depths = [...byDepth.keys()].sort((a, b) => a - b);

    let inserted = 0;
    const errors = [];

    for (const depth of depths) {
        const group = byDepth.get(depth);
        // Process each depth level in batches so parents are committed before children start.
        for (let i = 0; i < group.length; i += IMPORT_BATCH_SIZE) {
            const batch = group.slice(i, i + IMPORT_BATCH_SIZE);
            const results = await Promise.allSettled(
                batch.map((row) =>
                    rpc("upsert_category_from_path", {
                        p_name: row.name,
                        p_full_path: row.fullPath,
                        p_marketplace: "US",
                        p_depth: row.depth,
                        p_parent_path: row.parentPath,
                    })
                )
            );
            for (let j = 0; j < results.length; j++) {
                const r = results[j];
                if (r.status === "fulfilled") {
                    inserted++;
                } else {
                    const msg = `depth=${depth} row=${i + j}: ${r.reason?.message || r.reason}`;
                    errors.push(msg);
                    if (errors.length <= 5) log.warn(msg);
                }
            }
        }
        if (inserted % 2000 < group.length || depth === depths[depths.length - 1]) {
            log.info(`Depth ${depth} done — total ${inserted}/${rows.length}`);
        }
    }

    log.ok(`Import done: ${inserted} upserted, ${errors.length} errors`);
    return { total: rows.length, inserted, errors };
}

// ── Step 3: Generate embeddings ──────────────────────────────────────────────
async function generateEmbeddings() {
    log.header("STEP 2: Generating OpenAI Embeddings");

    log.info("Fetching categories from database...");
    const pageSize = 1000;
    let allCategories = [];
    let offset = 0;
    while (true) {
        const batch = await supaFetch("GET", `/amazon_categories?select=id,name,full_path&limit=${pageSize}&offset=${offset}`);
        if (!batch || batch.length === 0) break;
        allCategories.push(...batch);
        offset += batch.length;
        if (batch.length < pageSize) break;
    }

    // Skip categories that already have embeddings (resume support)
    log.info("Checking for existing embeddings (for resume)...");
    const alreadyEmbedded = new Set();
    offset = 0;
    while (true) {
        const batch = await supaFetch("GET", `/category_embeddings?select=category_id&model=eq.${encodeURIComponent(EMBEDDING_MODEL)}&limit=${pageSize}&offset=${offset}`);
        if (!batch || batch.length === 0) break;
        for (const row of batch) alreadyEmbedded.add(row.category_id);
        offset += batch.length;
        if (batch.length < pageSize) break;
    }
    if (alreadyEmbedded.size > 0) {
        const before = allCategories.length;
        allCategories = allCategories.filter((c) => !alreadyEmbedded.has(c.id));
        log.info(`Resuming — skipping ${before - allCategories.length} already embedded`);
    }

    if (allCategories.length === 0) {
        log.warn("No categories found — did Step 1 succeed?");
        return { total: 0, embedded: 0, errors: [] };
    }
    log.ok(`Found ${allCategories.length} categories to embed`);

    let embedded = 0;
    const errors = [];
    const batchCount = Math.ceil(allCategories.length / EMBED_BATCH_SIZE);

    for (let i = 0; i < allCategories.length; i += EMBED_BATCH_SIZE) {
        const batch = allCategories.slice(i, i + EMBED_BATCH_SIZE);
        const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1;

        try {
            const texts = batch.map((c) => `${c.name}. ${c.full_path}`);

            const { data: embeddings } = await withRetry(async () => {
                const oaiRes = await fetch("https://api.openai.com/v1/embeddings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
                    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
                });
                if (!oaiRes.ok) throw new Error(`OpenAI ${oaiRes.status}: ${await oaiRes.text()}`);
                return oaiRes.json();
            });

            const payload = batch.map((cat, idx) => ({
                category_id: cat.id,
                model: EMBEDDING_MODEL,
                embedding: embeddings[idx].embedding,
                source_text: texts[idx],
            }));

            // Upsert via SECURITY DEFINER RPC (works with anon key — no service_role needed)
            for (let k = 0; k < payload.length; k += INSERT_BATCH_SIZE) {
                await withRetry(() =>
                    rpc("upsert_embeddings_batch", { p_records: payload.slice(k, k + INSERT_BATCH_SIZE) })
                );
            }

            embedded += batch.length;
            if (batchNum % 10 === 0 || batchNum === batchCount) {
                log.info(`Batch ${batchNum}/${batchCount}: ${embedded} embedded`);
            }
        } catch (e) {
            errors.push(`Batch ${batchNum}: ${e.message}`);
            log.warn(`Batch ${batchNum} error: ${e.message}`);
        }
    }

    log.ok(`Embeddings done: ${embedded} stored, ${errors.length} errors`);
    return { total: allCategories.length, embedded, errors };
}

// ── Step 4: Verify ───────────────────────────────────────────────────────────
async function verify() {
    log.header("STEP 3: Verifying Setup");
    try {
        const catRes = await fetch(`${SUPABASE_URL}/rest/v1/amazon_categories?select=id&limit=1`, {
            headers: supaHeaders({ Prefer: "count=exact", "Range": "0-0" }),
        });
        const catCount = (catRes.headers.get("content-range") || "0/0").split("/")[1];
        log.ok(`Categories in DB: ${catCount}`);

        const embRes = await fetch(`${SUPABASE_URL}/rest/v1/category_embeddings?select=category_id&limit=1`, {
            headers: supaHeaders({ Prefer: "count=exact", "Range": "0-0" }),
        });
        const embCount = (embRes.headers.get("content-range") || "0/0").split("/")[1];
        log.ok(`Embeddings in DB: ${embCount}`);

        // Sample one embedding to check dimension (PostgREST returns vector as JSON array)
        const sample = await supaFetch("GET", "/category_embeddings?select=category_id,embedding&limit=1");
        if (Array.isArray(sample) && sample.length > 0) {
            const raw = sample[0].embedding;
            const vec = typeof raw === "string" ? JSON.parse(raw) : raw;
            log.ok(`Embedding dimension: ${Array.isArray(vec) ? vec.length : "(could not parse)"}`);

            if (Array.isArray(vec) && vec.length > 0) {
                const results = await rpc("match_categories_semantic", {
                    query_embedding: vec,
                    p_marketplace: "US",
                    p_match_count: 5,
                    p_min_similarity: 0.5,
                });
                log.ok(`Semantic search: ${Array.isArray(results) ? results.length : 0} matches`);
                if (Array.isArray(results) && results.length > 0) {
                    log.info(`  Top match: "${results[0].name}" (${results[0].similarity?.toFixed(4)})`);
                }
            }
        }
        return true;
    } catch (e) {
        log.err(`Verification: ${e.message}`);
        return false;
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const csvSize = (fs.statSync(CSV_PATH).size / 1024 / 1024).toFixed(1);
    const keyPreview = SUPABASE_KEY ? SUPABASE_KEY.substring(0, 25) + "..." : "NOT SET";

    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                   Silkflow Embeddings Setup Script                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

  Supabase URL:   ${SUPABASE_URL}
  Supabase Key:   ${keyPreview}
  OpenAI Model:   ${EMBEDDING_MODEL}
  CSV:            ${CSV_PATH} (${csvSize} MB)
`);

    if (!SUPABASE_URL || !SUPABASE_KEY) { log.err("Missing SUPABASE_URL or key"); process.exit(1); }
    if (!OPENAI_API_KEY) { log.err("Missing OPENAI_API_KEY"); process.exit(1); }
    if (!fs.existsSync(CSV_PATH)) { log.err(`CSV not found: ${CSV_PATH}`); process.exit(1); }

    try {
        const importStats = await importCategories();
        const embeddingStats = await generateEmbeddings();
        const ok = await verify();

        log.header("DONE");
        console.log(`  Categories imported:   ${importStats.inserted}`);
        console.log(`  Embeddings generated:  ${embeddingStats.embedded}`);
        console.log(`  Verification:          ${ok ? "PASSED ✓" : "FAILED ✗"}\n`);
        process.exit(ok ? 0 : 1);
    } catch (e) {
        log.err(`Fatal: ${e.message}`);
        console.error(e);
        process.exit(1);
    }
}

main();
