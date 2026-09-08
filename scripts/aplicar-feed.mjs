import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROJECT_REF = 'zbjhaupxhriedfsgtlbj'

function carregarEnv() {
  const arquivo = resolve(root, '.env')
  if (!existsSync(arquivo)) return
  for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].trim()
  }
}

carregarEnv()

const sql = readFileSync(resolve(root, 'supabase/feed.sql'), 'utf8')

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD || ''
  if (!password) {
    console.error('Falta SUPABASE_DB_PASSWORD no .env')
    process.exit(1)
  }
  const { default: pg } = await import('pg')
  const tentativas = [
    {
      label: 'db direto :5432',
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      user: 'postgres',
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    },
    {
      label: 'pooler sessão :5432',
      host: 'aws-0-sa-east-1.pooler.supabase.com',
      port: 5432,
      user: `postgres.${PROJECT_REF}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    },
    {
      label: 'pooler transação :6543',
      host: 'aws-0-sa-east-1.pooler.supabase.com',
      port: 6543,
      user: `postgres.${PROJECT_REF}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    },
  ]

  for (const cfg of tentativas) {
    const client = new pg.Client(cfg)
    try {
      await client.connect()
      await client.query(sql)
      const r = await client.query('select count(*)::int as n from mapa_feed_posts')
      await client.end()
      console.log(`Feed ok via ${cfg.label}. posts=`, r.rows[0].n)
      return
    } catch (err) {
      try {
        await client.end()
      } catch {
        /* ignore */
      }
      console.warn(`Postgres (${cfg.label}):`, err instanceof Error ? err.message.split('\n')[0] : err)
    }
  }
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
