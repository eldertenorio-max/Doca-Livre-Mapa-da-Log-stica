import type { Sessao } from './auth'

export function rotaInicial(sessao: Sessao | null) {
  if (!sessao) return '/login'
  if (sessao.isSuper) return '/painel'
  if (sessao.empresaSlug) return `/empresa/${sessao.empresaSlug}`
  return '/mapa'
}
