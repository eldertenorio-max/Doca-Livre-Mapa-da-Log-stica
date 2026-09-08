import { useEffect, useState } from 'react'
import { Bell, Newspaper } from 'lucide-react'
import { FeedMural } from '../components/feed/FeedMural'
import { useAuth } from '../lib/AuthContext'
import {
  listarNotificacoes,
  marcarNotificacoesLidas,
  tempoRelativo,
  type NotificacaoFeed,
} from '../lib/feedStore'
import '../styles/feed.css'

export function FeedPage() {
  const { sessao, minhaEmpresa } = useAuth()
  const [aba, setAba] = useState<'feed' | 'notificacoes'>('feed')
  const [notifs, setNotifs] = useState<NotificacaoFeed[]>([])

  async function recarregarNotifs() {
    if (!sessao) return
    setNotifs(await listarNotificacoes(sessao.usuario))
  }

  useEffect(() => {
    void recarregarNotifs()
  }, [sessao?.usuario])

  useEffect(() => {
    if (aba !== 'notificacoes' || !sessao) return
    void marcarNotificacoesLidas(sessao.usuario).then(() => recarregarNotifs())
  }, [aba, sessao?.usuario])

  const naoLidas = notifs.filter((n) => !n.lida).length
  const podePublicar = Boolean(sessao?.isSuper || minhaEmpresa)

  return (
    <div className="feed animate-fade-up">
      <header className="feed__hero">
        <div>
          <p className="feed__kicker">Doca Livre · Rede</p>
          <h1>Feed notícias</h1>
          <p>
            Publique serviços e capacidade da sua operação e acompanhe as divulgações das outras
            empresas da rede.
          </p>
        </div>
      </header>

      <div className="feed__tabs" role="tablist" aria-label="Feed ou notificações">
        <button
          type="button"
          className={`feed__tab ${aba === 'feed' ? 'is-active' : ''}`}
          onClick={() => setAba('feed')}
        >
          <Newspaper size={16} />
          Feed notícias
        </button>
        <button
          type="button"
          className={`feed__tab ${aba === 'notificacoes' ? 'is-active' : ''}`}
          onClick={() => setAba('notificacoes')}
        >
          <Bell size={16} />
          Notificações
          {naoLidas > 0 ? <span className="feed__badge">{naoLidas}</span> : null}
        </button>
      </div>

      {aba === 'notificacoes' ? (
        <section className="feed__lista" aria-label="Notificações">
          {notifs.length === 0 ? (
            <p className="feed__vazio">
              Nenhuma notificação ainda. Quando alguém curtir ou comentar sua divulgação, aparece aqui.
            </p>
          ) : (
            notifs.map((n) => (
              <article key={n.id} className={`feed__notif ${n.lida ? '' : 'is-nova'}`}>
                <span className="feed__notif-dot" aria-hidden />
                <div>
                  <p>{n.resumo}</p>
                  <time>{tempoRelativo(n.created_at)}</time>
                </div>
              </article>
            ))
          )}
        </section>
      ) : (
        <FeedMural
          mostrarComposer={podePublicar}
          composerEmpresa={minhaEmpresa}
          vazio="Nenhuma divulgação ainda. Publique a capacidade da sua operação."
        />
      )}
    </div>
  )
}
