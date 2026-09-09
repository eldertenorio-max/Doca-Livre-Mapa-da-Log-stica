import type { Sessao } from './auth'

export function rotaInicial(sessao: Sessao | null) {
  if (!sessao) return '/mapa'
  if (sessao.isSuper) return '/painel'
  if (sessao.empresaSlug) return '/perfil'
  return '/app/mapa'
}
