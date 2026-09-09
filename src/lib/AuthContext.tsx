import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Empresa } from '../types'
import {
  autenticar,
  empresaDaSessao,
  loadSessao,
  registrarEmpresa,
  saveSessao,
  SUPER_USUARIOS,
  USUARIOS_EMPRESA,
  type Sessao,
} from './auth'
import { listarEmpresas } from './cadastroStore'
import { EMPRESA_DOCA_LIVRE } from './empresaDocaLivre'
import { sincronizarCatalogo, unirComCatalogoLocal, salvarUsuarioRemoto } from './supabaseSync'
import { EMPRESAS } from '../data/empresas'

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

function montarLista(remoto: Empresa[]): Empresa[] {
  const extra = listarEmpresas().filter((e) => e.origem === 'cadastro')
  return unirComCatalogoLocal(remoto.filter((e) => e.origem !== 'cadastro'), [...EMPRESAS, ...extra])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => loadSessao())
  const [empresas, setEmpresas] = useState<Empresa[]>(() => listarEmpresas())

  useEffect(() => {
    let ativo = true
    void sincronizarCatalogo().then((lista) => {
      if (!ativo) return
      setEmpresas(montarLista(lista))
    })
    for (const conta of [...SUPER_USUARIOS, ...USUARIOS_EMPRESA]) {
      void salvarUsuarioRemoto(conta).catch(() => undefined)
    }
    return () => {
      ativo = false
    }
  }, [])

  const value = useMemo<AuthCtx>(() => {
    async function recarregarEmpresas() {
      const lista = await sincronizarCatalogo()
      setEmpresas(montarLista(lista))
    }

    return {
      sessao,
      empresas,
      minhaEmpresa:
        empresas.find((e) => e.id === sessao?.empresaId || e.slug === sessao?.empresaSlug) ??
        empresaDaSessao(sessao) ??
        (sessao?.isSuper ? EMPRESA_DOCA_LIVRE : undefined),
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
