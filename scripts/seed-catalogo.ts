import { createClient } from '@supabase/supabase-js'
import { EMPRESAS } from '../src/data/empresas'
import type { Empresa } from '../src/types'

const url = process.env.VITE_SUPABASE_URL || 'https://zbjhaupxhriedfsgtlbj.supabase.co'
const anon = process.env.VITE_SUPABASE_ANON_KEY

if (!anon) {
  throw new Error('Falta VITE_SUPABASE_ANON_KEY')
}

const supabase = createClient(url, anon)

function linha(e: Empresa) {
  return {
    id: e.id,
    slug: e.slug,
    categoria: e.categoria,
    uf: e.uf,
    cidade: e.cidade,
    lat: e.lat,
    lng: e.lng,
    origem: e.origem,
    payload: e,
  }
}

async function main() {
  const lote = 80
  for (let i = 0; i < EMPRESAS.length; i += lote) {
    const fatia = EMPRESAS.slice(i, i + lote).map(linha)
    const { error } = await supabase.from('mapa_empresas').upsert(fatia, { onConflict: 'id' })
    if (error) throw error
    console.log(`Catálogo ${Math.min(i + lote, EMPRESAS.length)}/${EMPRESAS.length}`)
  }

  const { error } = await supabase.from('mapa_usuarios').upsert(
    [
      {
        usuario: 'Diego',
        email: 'diego@docalivre.com',
        senha: 'diego123',
        nome: 'Diego',
        papel: 'super',
        nivel_hierarquia: 'super',
        superior: null,
      },
      {
        usuario: 'Elder',
        email: 'elder@docalivre.com',
        senha: 'Elder123',
        nome: 'Elder',
        papel: 'super',
        nivel_hierarquia: 'super',
        superior: null,
      },
    ],
    { onConflict: 'usuario' },
  )
  if (error) throw error
  console.log('Superusuários gravados.')
}

void main()
