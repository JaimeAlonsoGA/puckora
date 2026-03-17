import { createDb } from '../../shared/db'

async function main() {
    const db = createDb()
    const tables = ['gs_suppliers', 'gs_products', 'gs_category_signals'] as const
    for (const t of tables) {
        const { count, error } = await (db as any).from(t).select('*', { count: 'exact', head: true })
        if (error) {
            console.log(`${t}: ERROR — ${error.message}`)
        } else {
            console.log(`${t}: OK — ${count} rows`)
        }
    }
}
main().catch(console.error)
