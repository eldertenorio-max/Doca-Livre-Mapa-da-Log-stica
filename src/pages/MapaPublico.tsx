import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LOGO_DOCA_LIVRE_SRC } from '../lib/brandAssets'
import { useAuth } from '../lib/AuthContext'
import { CATEGORIAS, categoriaPorId } from '../lib/categorias'
import {
  estadoBuscasPublicas,
  MAPA_PUBLICO_LIMITE_BUSCAS,
  registrarBuscaPublica,
} from '../lib/mapaPublicoBuscas'
import { PLANOS_PUBLICOS } from '../lib/planosPublicos'
import { rotaInicial } from '../lib/rotasApp'
import { aplicarFiltros, sugerirBusca, type SugestaoBusca } from '../lib/search'
import type { CategoriaId, Empresa } from '../types'
import '../styles/mapa-publico.css'
import '../styles/mapa.css'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function pinHtml(e: Empresa) {
  const cat = categoriaPorId(e.categoria)
  return `<div class="pin-empresa__inner" style="background:${cat.cor}" title="${escapeHtml(e.nome_fantasia)}">${cat.emoji}</div>`
}

function popupPublicoHtml(e: Empresa, logado: boolean) {
  const cat = categoriaPorId(e.categoria)
  if (logado) {
    return `
      <div class="mapa-pub-popup">
        <p class="mapa-pub-popup__tipo">${escapeHtml(e.nome_fantasia)}</p>
        <p class="mapa-pub-popup__local">${escapeHtml(cat.label)} · ${escapeHtml(e.cidade)} / ${escapeHtml(e.uf)}</p>
        <button type="button" class="mapa-pub-popup__cta js-mapa-pub-perfil" data-slug="${escapeHtml(e.slug)}">Ver perfil</button>
      </div>
    `
  }
  return `
    <div class="mapa-pub-popup">
      <p class="mapa-pub-popup__tipo">${escapeHtml(e.nome_fantasia)}</p>
      <p class="mapa-pub-popup__local">${escapeHtml(cat.label)} · ${escapeHtml(e.cidade)} / ${escapeHtml(e.uf)}</p>
      <p class="mapa-pub-popup__lock">Contato, WhatsApp e CNPJ só para assinante.</p>
      <button type="button" class="mapa-pub-popup__cta js-mapa-pub-assinar">Assinar para ver contato</button>
    </div>
  `
}

export function MapaPublicoPage() {
  const { empresas, sessao } = useAuth()
  const navigate = useNavigate()
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const buscaFitRef = useRef('')
  const [query, setQuery] = useState('')
  const [aplicada, setAplicada] = useState('')
  const [categoria, setCategoria] = useState<CategoriaId | null>(null)
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false)
  const [erro, setErro] = useState('')
  const [restam, setRestam] = useState(() =>
    sessao ? MAPA_PUBLICO_LIMITE_BUSCAS : estadoBuscasPublicas().restam,
  )
  const [showPaywall, setShowPaywall] = useState(() => !sessao && estadoBuscasPublicas().esgotado)

  const logado = Boolean(sessao)
  const sugestoes = useMemo(() => sugerirBusca(query, empresas, 8), [query, empresas])

  const filtradas = useMemo(
    () => aplicarFiltros(empresas, { query: aplicada, categoria }),
    [empresas, aplicada, categoria],
  )

  const contagem = useMemo(() => {
    const base = aplicarFiltros(empresas, { query: aplicada, categoria: null })
    return CATEGORIAS.map((c) => ({
      ...c,
      qtd: base.filter((e) => e.categoria === c.id).length,
    })).filter((c) => c.qtd > 0)
  }, [empresas, aplicada])

  useEffect(() => {
    document.title = 'Mapa da Logística — Doca Livre'
  }, [])

  useEffect(() => {
    function onClick(ev: MouseEvent) {
      const el = ev.target as HTMLElement | null
      if (el?.closest?.('.js-mapa-pub-assinar')) {
        ev.preventDefault()
        setShowPaywall(true)
        return
      }
      const perfil = el?.closest?.('.js-mapa-pub-perfil') as HTMLElement | null
      const slug = perfil?.getAttribute('data-slug')
      if (slug) {
        ev.preventDefault()
        navigate(`/empresa/${slug}?from=mapa`)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [navigate])

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = L.map(mapEl.current, {
      center: [-14.2, -51.9],
      zoom: 4,
      minZoom: 4,
      maxZoom: 16,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const t = window.setTimeout(() => map.invalidateSize(), 80)
    return () => {
      window.clearTimeout(t)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    for (const e of filtradas) {
      const marker = L.marker([e.lat, e.lng], {
        icon: L.divIcon({
          className: 'pin-empresa',
          html: pinHtml(e),
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        }),
      })
      marker.bindPopup(popupPublicoHtml(e, logado), {
        className: 'mapa-pub-leaflet',
        maxWidth: 280,
        minWidth: 220,
      })
      marker.addTo(layer)
    }
    const chave = `${aplicada}|${categoria ?? ''}|${filtradas.length}`
    if (buscaFitRef.current === chave) return
    buscaFitRef.current = chave
    if (aplicada && filtradas.length === 1) {
      map.setView([filtradas[0].lat, filtradas[0].lng], 10)
    } else if (aplicada && filtradas.length > 1) {
      map.fitBounds(L.latLngBounds(filtradas.map((e) => [e.lat, e.lng] as [number, number])).pad(0.18), {
        maxZoom: 10,
      })
    } else if (!aplicada && !categoria) {
      map.setView([-14.2, -51.9], 4)
    }
  }, [filtradas, aplicada, categoria, logado])

  function consumirBusca() {
    if (logado) return true
    if (estadoBuscasPublicas().esgotado) {
      setShowPaywall(true)
      setRestam(0)
      return false
    }
    const consumo = registrarBuscaPublica()
    setRestam(consumo.restam)
    if (!consumo.ok) {
      setShowPaywall(true)
      return false
    }
    if (consumo.restam === 0) setShowPaywall(true)
    return true
  }

  function aplicarConsulta(texto: string, sugestao?: SugestaoBusca) {
    const q = texto.trim()
    if (!q) {
      setErro('Digite uma empresa, cidade, UF ou serviço.')
      return
    }
    if (!consumirBusca()) return
    setErro('')
    setSugestoesAbertas(false)
    if (sugestao?.tipo === 'categoria') {
      const id = (sugestao.valor as CategoriaId) || CATEGORIAS.find((c) => c.label === sugestao.texto)?.id
      setCategoria(id ?? null)
      setAplicada('')
      setQuery('')
      return
    }
    if (sugestao?.tipo === 'empresa') {
      setAplicada(sugestao.texto)
      setQuery(sugestao.texto)
      return
    }
    setAplicada(sugestao?.texto || q)
    setQuery(sugestao?.texto || q)
  }

  function onBuscar(e: FormEvent) {
    e.preventDefault()
    aplicarConsulta(query, sugestoes[0])
  }

  function limparBusca() {
    setQuery('')
    setAplicada('')
    setErro('')
  }

  return (
    <div className="mapa-pub">
      <header className="mapa-pub__top">
        <Link to="/mapa" className="mapa-pub__brand">
          <img src={LOGO_DOCA_LIVRE_SRC} alt="Doca Livre" />
          <span>
            <strong>Doca Livre</strong>
            <em>Mapa da Logística</em>
          </span>
        </Link>
        <div className="mapa-pub__top-actions">
          {logado ? (
            <Link className="mapa-pub__btn mapa-pub__btn--ghost" to={rotaInicial(sessao)}>
              Ir para o sistema
            </Link>
          ) : (
            <>
              <Link className="mapa-pub__btn mapa-pub__btn--ghost" to="/login">
                Entrar
              </Link>
              <Link className="mapa-pub__btn mapa-pub__btn--solid" to="/cadastro">
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="mapa-pub__bar">
        <form className="mapa-pub__search" onSubmit={onBuscar}>
          <div>
            <input
              className="mapa-pub__q"
              value={query}
              onChange={(ev) => {
                setQuery(ev.target.value)
                setErro('')
                setSugestoesAbertas(true)
              }}
              onFocus={() => setSugestoesAbertas(true)}
              placeholder="Buscar empresa, cidade, UF ou serviço — ex.: empilhadeira SP"
              autoComplete="off"
              spellCheck={false}
            />
            {sugestoesAbertas && sugestoes.length > 0 ? (
              <ul>
                {sugestoes.map((s) => (
                  <li key={`${s.tipo}-${s.valor ?? s.texto}`}>
                    <button
                      type="button"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => aplicarConsulta(s.texto, s)}
                    >
                      {s.texto}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button type="submit">Buscar</button>
        </form>
        <p className="mapa-pub__creditos">
          {logado
            ? 'Conta logada · buscas ilimitadas neste mapa'
            : restam > 0
              ? `${restam} de ${MAPA_PUBLICO_LIMITE_BUSCAS} buscas grátis restantes`
              : 'Buscas grátis esgotadas'}
        </p>
        {!logado && restam === 0 ? (
          <div className="mapa-pub__cta-esgotado">
            <span>Para continuar buscando e ver contato das empresas, assine o Mapa da Logística.</span>
            <button type="button" onClick={() => setShowPaywall(true)}>
              Assinar para continuar
            </button>
          </div>
        ) : null}
        {erro ? <p className="mapa-pub__erro">{erro}</p> : null}
        {aplicada ? (
          <p className="mapa-pub__origem">
            Mostrando empresas para <strong>{aplicada}</strong>
            {' · '}
            <button type="button" onClick={limparBusca}>
              Ver Brasil inteiro
            </button>
          </p>
        ) : (
          <p className="mapa-pub__origem">
            Visão geral do Brasil. Busque uma empresa, cidade ou serviço para aproximar (conta como 1
            busca).
          </p>
        )}
      </div>

      <div className="mapa-pub__chips" role="list">
        {contagem.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            className={`mapa-pub__chip${categoria === item.id ? ' is-on' : ''}`}
            onClick={() => setCategoria((atual) => (atual === item.id ? null : item.id))}
          >
            {item.emoji} {item.label} <span>{item.qtd}</span>
          </button>
        ))}
      </div>

      <div ref={mapEl} className="mapa-pub__map" role="application" aria-label="Mapa público da logística" />

      <p className="mapa-pub__foot">
        {filtradas.length} empresa{filtradas.length === 1 ? '' : 's'} visível
        {filtradas.length === 1 ? '' : 'is'} · contato só depois da assinatura
      </p>

      {showPaywall ? (
        <div className="mapa-pub-modal" role="dialog" aria-modal="true" aria-labelledby="mapa-pub-pay-title">
          <div className="mapa-pub-modal__card mapa-pub-modal__card--planos">
            <h2 id="mapa-pub-pay-title">Escolha um plano</h2>
            <p>
              {logado
                ? 'Assine para liberar contato das empresas e as ferramentas do sistema.'
                : `As ${MAPA_PUBLICO_LIMITE_BUSCAS} buscas grátis acabaram. Assine para continuar no mapa e entrar no Mapa da Logística.`}
            </p>
            <div className="mapa-pub-planos">
              {PLANOS_PUBLICOS.map((plano) => (
                <article
                  key={plano.id}
                  className={`mapa-pub-plano${plano.destaque ? ' is-destaque' : ''}`}
                >
                  {plano.destaque ? <span className="mapa-pub-plano__tag">Mais escolhido</span> : null}
                  <h3>{plano.nome}</h3>
                  <p className="mapa-pub-plano__para">{plano.para}</p>
                  <p className="mapa-pub-plano__preco">
                    <strong>{plano.preco}</strong>
                    <small>{plano.periodo}</small>
                  </p>
                  <p className="mapa-pub-plano__extra">{plano.extra}</p>
                  <ul>
                    {plano.itens.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Link className="mapa-pub__btn mapa-pub__btn--solid" to={`/cadastro?plano=${plano.id}`}>
                    Assinar {plano.nome}
                  </Link>
                </article>
              ))}
            </div>
            <div className="mapa-pub-modal__acoes">
              <Link className="mapa-pub__btn mapa-pub__btn--ghost" to="/login">
                Já tenho conta
              </Link>
              <button type="button" className="mapa-pub-modal__fechar" onClick={() => setShowPaywall(false)}>
                Continuar só olhando o mapa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
