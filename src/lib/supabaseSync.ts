import type { Empresa } from '../types'
import { EMPRESAS } from '../data/empresas'
import { supabase, isSupabaseConfigured } from './supabase'
import type { ContaUsuario } from './auth'

export type LinhaEmpresa = {
  id: string
  slug: string
  categoria: string
  uf: string
  cidade: string | null
  lat: number | null
  lng: number | null
  origem: string | null
  payload: Empresa
}

export function linhaDeEmpresa(e: Empresa): LinhaEmpresa {
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

function empresaDeLinha(row: LinhaEmpresa): Empresa | null {
  const p = row.payload
  if (p && typeof p === 'object' && typeof p.id === 'string' && typeof p.slug === 'string') {
    return p
  }
  return null
}

export function tabelaAindaNaoExiste(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  return /PGRST205|schema cache|Could not find the table/i.test(msg)
}

async function upsertLote<T extends { id?: string; usuario?: string }>(tabela: string, linhas: T[]) {
  if (!supabase || linhas.length === 0) return
  const { error } = await supabase.from(tabela).upsert(linhas, { onConflict: tabela === 'mapa_usuarios' ? 'usuario' : 'id' })
  if (error) throw error
}

export async function buscarEmpresasRemotas(): Promise<Empresa[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('mapa_empresas').select('payload').limit(2000)
  if (error) {
    console.warn('Supabase empresas:', error.message)
    return null
  }
  const lista = (data ?? [])
    .map((row) => empresaDeLinha(row as LinhaEmpresa))
    .filter((e): e is Empresa => Boolean(e))
  return lista
}

export async function salvarEmpresaRemota(empresa: Empresa) {
  if (!supabase) return
  const { error } = await supabase.from('mapa_empresas').upsert(linhaDeEmpresa(empresa), { onConflict: 'id' })
  if (error) throw new Error(error.message)
}

export async function enviarCatalogoSeVazio(catalogo: Empresa[] = EMPRESAS) {
  if (!supabase) return { enviadas: 0, jaTinha: 0 }
  const { count, error: countError } = await supabase
    .from('mapa_empresas')
    .select('id', { count: 'exact', head: true })
  if (countError) throw new Error(countError.message)
  const jaTinha = count ?? 0
  if (jaTinha > 0) return { enviadas: 0, jaTinha }

  const lote = 80
  for (let i = 0; i < catalogo.length; i += lote) {
    await upsertLote('mapa_empresas', catalogo.slice(i, i + lote).map(linhaDeEmpresa))
  }
  return { enviadas: catalogo.length, jaTinha: 0 }
}

export async function sincronizarCatalogo(): Promise<Empresa[]> {
  if (!isSupabaseConfigured || !supabase) return EMPRESAS
  try {
    await enviarCatalogoSeVazio(EMPRESAS)
    const remotas = await buscarEmpresasRemotas()
    if (remotas && remotas.length > 0) return remotas
  } catch (err) {
    console.warn('Falha ao sincronizar catálogo com o Supabase', err)
  }
  return EMPRESAS
}

export async function buscarUsuarioRemoto(login: string): Promise<ContaUsuario | null> {
  if (!supabase) return null
  const loginLimpo = login.trim()
  const n = loginLimpo.toLowerCase()
  const campos = 'usuario,email,senha,nome,papel,nivel_hierarquia,superior,empresa_id,empresa_slug'
  const tenta = async (coluna: 'usuario' | 'email') => {
    const { data, error } = await supabase.from('mapa_usuarios').select(campos).ilike(coluna, loginLimpo).maybeSingle()
    if (error) {
      console.warn('Supabase usuários:', error.message)
      return null
    }
    return data
  }
  const row = (await tenta('usuario')) ?? (await tenta('email'))
  if (!row) return null
  const email = row.email ?? ''
  if (
    row.usuario?.toLowerCase() !== n &&
    email.toLowerCase() !== n &&
    email.split('@')[0]?.toLowerCase() !== n
  ) {
    return null
  }
  return {
    usuario: row.usuario,
    email,
    senha: row.senha,
    nome: row.nome,
    papel: row.papel as ContaUsuario['papel'],
    nivelHierarquia: row.nivel_hierarquia as ContaUsuario['nivelHierarquia'],
    superior: row.superior,
    empresaId: row.empresa_id ?? undefined,
    empresaSlug: row.empresa_slug ?? undefined,
  }
}

export async function salvarUsuarioRemoto(conta: ContaUsuario) {
  if (!supabase) return
  const { error } = await supabase.from('mapa_usuarios').upsert(
    {
      usuario: conta.usuario,
      email: conta.email,
      senha: conta.senha,
      nome: conta.nome,
      papel: conta.papel,
      nivel_hierarquia: conta.nivelHierarquia,
      superior: conta.superior,
      empresa_id: conta.empresaId ?? null,
      empresa_slug: conta.empresaSlug ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'usuario' },
  )
  if (error) throw new Error(error.message)
}
