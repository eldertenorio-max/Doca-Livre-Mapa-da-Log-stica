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

const sql = readFileSync(resolve(root, 'supabase/mapa_publico_cotas.sql'), 'utf8')

async function aplicarViaManagement() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) return false
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const texto = await res.text()
  if (!res.ok) {
    console.warn('Management API:', res.status, texto.slice(0, 400))
    return false
  }
  console.log('Cota aplicada via Management API.')
  return true
}

async function aplicarViaPostgres() {
  const password = process.env.SUPABASE_DB_PASSWORD || ''
  const dbUrl = process.env.DATABASE_URL || ''
  if (!password && (!dbUrl || /YOUR-PASSWORD|SUA_SENHA|\[/.test(dbUrl))) return false

  const { default: pg } = await import('pg')
  const tentativas = []
  if (dbUrl && !/YOUR-PASSWORD|SUA_SENHA|\[/.test(dbUrl)) {
    tentativas.push({ label: 'DATABASE_URL', connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  }
  if (password) {
    tentativas.push(
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
    )
  }

  for (const cfg of tentativas) {
    const client = new pg.Client(cfg)
    try {
      await client.connect()
      await client.query(sql)
      const r = await client.query(
        `select count(*)::int as n from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'mapa_publico_cota_consumir'`,
      )
      await client.end()
      console.log(`Cota ok via ${cfg.label}. funcao=`, r.rows[0].n)
      return true
    } catch (err) {
      try {
        await client.end()
      } catch {
        /* ignore */
      }
      console.warn(`Postgres (${cfg.label}):`, err instanceof Error ? err.message.split('\n')[0] : err)
    }
  }
  return false
}

async function main() {
  const ok = (await aplicarViaManagement()) || (await aplicarViaPostgres())
  if (!ok) {
    console.error('Abra o SQL Editor do Supabase e cole supabase/mapa_publico_cotas.sql')
    console.error(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`)
    process.exit(2)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
