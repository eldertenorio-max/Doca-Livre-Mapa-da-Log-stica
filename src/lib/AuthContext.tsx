import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Empresa } from '../types'
import {
  autenticar,
  empresaDaSessao,
  loadSessao,
  registrarEmpresa,
  saveSessao,
  type Sessao,
} from './auth'
import { listarEmpresas } from './cadastroStore'
import { sincronizarCatalogo } from './supabaseSync'

type AuthCtx = {
  sessao: Sessao | null
  empresas: Empresa[]
  minhaEmpresa: Empresa | undefined
  login: (usuario: string, senha: string) => Promise<string | null>
  logout: () => void
  cadastrar: (params: Parameters<typeof registrarEmpresa>[0]) => Promise<Sessao>
  recarregarEmpresas: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => loadSessao())
  const [empresas, setEmpresas] = useState<Empresa[]>(() => listarEmpresas())

  useEffect(() => {
    let ativo = true
    void sincronizarCatalogo().then((lista) => {
      if (!ativo) return
      const extra = listarEmpresas().filter((e) => e.origem === 'cadastro')
      const ids = new Set(lista.map((e) => e.id))
      const slugs = new Set(lista.map((e) => e.slug))
      setEmpresas([...lista.filter((e) => e.origem !== 'cadastro'), ...extra.filter((e) => !ids.has(e.id) && !slugs.has(e.slug))])
    })
    return () => {
      ativo = false
    }
  }, [])

  const value = useMemo<AuthCtx>(() => {
    async function recarregarEmpresas() {
      const lista = await sincronizarCatalogo()
      const extra = listarEmpresas().filter((e) => e.origem === 'cadastro')
      const ids = new Set(lista.map((e) => e.id))
      const slugs = new Set(lista.map((e) => e.slug))
      setEmpresas([...lista.filter((e) => e.origem !== 'cadastro'), ...extra.filter((e) => !ids.has(e.id) && !slugs.has(e.slug))])
    }

    return {
      sessao,
      empresas,
      minhaEmpresa:
        empresas.find((e) => e.id === sessao?.empresaId || e.slug === sessao?.empresaSlug) ??
        empresaDaSessao(sessao),
      recarregarEmpresas,
      async login(usuario, senha) {
        const r = await autenticar(usuario, senha)
        if (!r.ok) return r.erro
        setSessao(r.sessao)
        await recarregarEmpresas()
        return null
      },
      logout() {
        saveSessao(null)
        setSessao(null)
      },
      async cadastrar(params) {
        const next = await registrarEmpresa(params)
        setSessao(next)
        await recarregarEmpresas()
        return next
      },
    }
  }, [sessao, empresas])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
