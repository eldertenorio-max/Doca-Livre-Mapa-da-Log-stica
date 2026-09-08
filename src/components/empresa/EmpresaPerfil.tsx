import { ExternalLink, Mail, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Empresa } from '../../types'
import { FeedMural } from '../feed/FeedMural'
import { categoriaPorId, nivelPorId } from '../../lib/categorias'
import { labelPapelHierarquia, papelHierarquiaDaEmpresa } from '../../lib/orgHierarchy'
import { PontoMapPreview } from './PontoMapPreview'
import '../../styles/perfil-empresa.css'

function whatsappLink(raw?: string) {
  const d = (raw || '').replace(/\D/g, '')
  if (d.length < 10) return null
  const full = d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${full}`
}

function enderecoCompleto(e: Empresa) {
  const logradouro = [e.endereco, e.numero].filter(Boolean).join(', ')
  const partes = [logradouro, e.bairro, [e.cidade, e.uf].filter(Boolean).join(' / ')]
  if (e.cep) partes.push(`CEP ${e.cep}`)
  return partes.filter(Boolean).join(' · ')
}

type Props = {
  empresa: Empresa
  eDono?: boolean
}

export function EmpresaPerfil({ empresa: e, eDono = false }: Props) {
  const cat = categoriaPorId(e.categoria)
  const nivel = nivelPorId(e.nivel_integracao)
  const papel = labelPapelHierarquia(papelHierarquiaDaEmpresa(e))
  const wa = whatsappLink(e.telefone)
  const mapsUrl = `https://www.google.com/maps?q=${e.lat},${e.lng}`
  const titulo = `${e.nome_fantasia} ${e.cidade}-${e.uf}`

  return (
    <article className="tv-perfil tv-perfil--fullscreen tv-perfil--in-shell">
      <header className="tv-perfil__top">
        <div className="tv-perfil__brand-row">
          {e.logo_url ? (
            <img className="tv-perfil__logo" src={e.logo_url} alt="" />
          ) : (
            <div className="tv-perfil__logo tv-perfil__logo--empty" aria-hidden>
              {e.nome_fantasia.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="tv-perfil__titles">
            <h1>{titulo}</h1>
            <p className="tv-perfil__especialidades">
              {cat.emoji} {cat.label} · {papel}
              {e.especialidades.length ? ` · ${e.especialidades.join(' · ')}` : ''}
            </p>
          </div>
        </div>
        <p className="tv-perfil__meta">
          <strong>RAZÃO SOCIAL:</strong> {e.razao_social}
          {e.cnpj ? (
            <>
              {' '}
              - <strong>CNPJ:</strong> {e.cnpj}
            </>
          ) : null}
        </p>
        {nivel ? (
          <p className="tv-perfil__meta" style={{ marginTop: 8 }}>
            <strong>Nível de integração:</strong> {nivel.label} — {nivel.resumo}
          </p>
        ) : null}
      </header>

      <div className="tv-perfil__body">
        <div className="tv-perfil__main">
          <section className="tv-perfil__section">
            <h2>Apresentação</h2>
            <p>{e.apresentacao}</p>
          </section>

          <section className="tv-perfil__section">
            <h2>O que a empresa faz</h2>
            {e.servicos_intro ? <p>{e.servicos_intro}</p> : null}
            <ul>
              {e.servicos.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="tv-perfil__section">
            <h2>Área de atuação</h2>
            <p>{e.area_atuacao}</p>
            {e.cobertura ? <p>{e.cobertura}</p> : null}
          </section>

          <section className="tv-perfil__section">
            <h2>Categorias e funções</h2>
            <p>{e.subcategorias.join(' · ')}</p>
          </section>

          {e.referencias ? (
            <section className="tv-perfil__section">
              <h2>Referências</h2>
              <p className="tv-perfil__pre">{e.referencias}</p>
            </section>
          ) : null}

          <section className="tv-perfil__section">
            <h2>Contato</h2>
            <ul className="tv-perfil__contato">
              {e.telefone ? <li>Telefone / WhatsApp: {e.telefone}</li> : null}
              {e.email ? <li>E-mail: {e.email}</li> : null}
              <li className="tv-perfil__endereco">
                <MapPin size={14} aria-hidden />
                <span>
                  <strong>Endereço:</strong> {enderecoCompleto(e)}
                </span>
              </li>
            </ul>
          </section>

          {e.fontes && e.fontes.length > 0 ? (
            <section className="tv-perfil__section">
              <h2>Fontes públicas</h2>
              <ul>
                {e.fontes.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noreferrer">
                      {f.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="tv-perfil__section tv-perfil__section--feed">
            <h2>{eDono ? 'Minhas publicações' : 'Publicações'}</h2>
            <p className="tv-perfil__feed-intro">
              {eDono
                ? 'Tudo o que você divulga no feed fica salvo neste perfil.'
                : `Divulgações de ${e.nome_fantasia} na rede do mapa.`}
            </p>
            <FeedMural
              empresaFiltro={{ id: e.id, slug: e.slug }}
              mostrarComposer={eDono}
              composerEmpresa={e}
              vazio={
                eDono
                  ? 'Você ainda não publicou. Escreva acima para divulgar um serviço.'
                  : 'Esta empresa ainda não publicou no feed.'
              }
            />
          </section>

          <div className="tv-perfil__actions">
            {wa ? (
              <a className="tv-perfil__btn tv-perfil__btn--wa" href={wa} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            ) : null}
            {e.email ? (
              <a className="tv-perfil__btn tv-perfil__btn--mail" href={`mailto:${e.email}`}>
                <Mail size={14} /> Enviar e-mail
              </a>
            ) : null}
            {e.site_url ? (
              <a className="tv-perfil__btn" href={e.site_url} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> Site
              </a>
            ) : null}
            <a className="tv-perfil__btn" href={mapsUrl} target="_blank" rel="noreferrer">
              <MapPin size={14} /> Abrir no Maps
            </a>
            <Link className="tv-perfil__btn tv-perfil__btn--ghost" to="/app/mapa">
              Voltar ao mapa
            </Link>
          </div>
        </div>

        <aside className="tv-perfil__mapa">
          <div className="tv-perfil__mapa-card">
            <div className="tv-perfil__mapa-head">
              <h2>Mapa de localização</h2>
              <a className="tv-perfil__mapa-open" href={mapsUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={13} /> Abrir no Maps
              </a>
            </div>
            <PontoMapPreview lat={e.lat} lng={e.lng} height={420} className="tv-perfil__mapa-preview" />
            <p className="tv-perfil__mapa-meta">{enderecoCompleto(e)}</p>
          </div>
        </aside>
      </div>
    </article>
  )
}
