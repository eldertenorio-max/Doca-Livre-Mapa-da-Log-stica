import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
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

const url = process.env.VITE_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`
const anon = process.env.VITE_SUPABASE_ANON_KEY || ''
const sql = readFileSync(resolve(root, 'supabase/schema.sql'), 'utf8')

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
  console.log('Schema aplicado via Management API.')
  return true
}

async function aplicarViaPostgres() {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl || /YOUR-PASSWORD|SUA_SENHA|\[/.test(dbUrl)) return false
  try {
    const { default: pg } = await import('pg')
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
    await client.connect()
    await client.query(sql)
    await client.end()
    console.log('Schema aplicado via DATABASE_URL.')
    return true
  } catch (err) {
    console.warn('Postgres:', err instanceof Error ? err.message : err)
    return false
  }
}

async function tabelaPronta() {
  const res = await fetch(`${url}/rest/v1/mapa_empresas?select=id&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  })
  return res.ok
}

async function main() {
  if (!anon) {
    console.error('Falta VITE_SUPABASE_ANON_KEY no .env')
    process.exit(1)
  }

  let ok = (await tabelaPronta()) || (await aplicarViaManagement()) || (await aplicarViaPostgres())
  if (!ok && (await tabelaPronta())) ok = true

  if (!ok) {
    console.error('A tabela ainda não existe. Abra o SQL Editor do Supabase e cole supabase/schema.sql')
    console.error(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`)
    process.exit(2)
  }

  console.log('Tabelas ok. Enviando catálogo...')
  execFileSync('npx', ['tsx', 'scripts/seed-catalogo.ts'], { cwd: root, stdio: 'inherit', shell: true })

  const supabase = createClient(url, anon)
  const { count, error } = await supabase.from('mapa_empresas').select('id', { count: 'exact', head: true })
  if (error) throw error
  console.log(`Empresas no Supabase: ${count}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
