import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ImagePlus, MessageCircle, Send, Trash2 } from 'lucide-react'
import type { Empresa } from '../../types'
import { useAuth } from '../../lib/AuthContext'
import { iniciaisEmpresa, logoSrcEmpresa } from '../../lib/empresaVisual'
import {
  TIPOS_POST_FEED,
  alternarCurtida,
  comentarPost,
  excluirPostFeed,
  labelTipoPost,
  listarPostsFeed,
  publicarPostFeed,
  tempoRelativo,
  type PostFeed,
  type TipoPostFeed,
} from '../../lib/feedStore'
import '../../styles/feed.css'

type Props = {
  empresaFiltro?: Pick<Empresa, 'id' | 'slug'>
  mostrarComposer: boolean
  composerEmpresa?: Empresa
  vazio?: string
}

export function postsDaEmpresa(posts: PostFeed[], empresa: Pick<Empresa, 'id' | 'slug'>) {
  return posts.filter((p) => {
    if (p.empresa_slug === empresa.slug) return true
    if (empresa.id && p.empresa_id === empresa.id) return true
    if (
      empresa.slug === 'doca-livre' &&
      !p.empresa_slug &&
      (p.empresa_nome === 'Doca Livre' || !p.empresa_id)
    ) {
      return true
    }
    return false
  })
}

export function FeedMural({ empresaFiltro, mostrarComposer, composerEmpresa, vazio }: Props) {
  const navigate = useNavigate()
  const { sessao, empresas } = useAuth()
  const [posts, setPosts] = useState<PostFeed[]>([])
  const [filtro, setFiltro] = useState<TipoPostFeed | 'todos'>('todos')
  const [texto, setTexto] = useState('')
  const [imagem, setImagem] = useState('')
  const [tipo, setTipo] = useState<TipoPostFeed>('servico')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [comentarioAberto, setComentarioAberto] = useState<string | null>(null)
  const [rascunhoComentario, setRascunhoComentario] = useState('')

  async function recarregar() {
    setPosts(await listarPostsFeed())
  }

  useEffect(() => {
    void recarregar()
  }, [sessao?.usuario, empresaFiltro?.slug])

  const visiveis = useMemo(() => {
    const base = empresaFiltro ? postsDaEmpresa(posts, empresaFiltro) : posts
    return filtro === 'todos' ? base : base.filter((p) => p.tipo === filtro)
  }, [empresaFiltro, filtro, posts])

  async function onPublicar(e: FormEvent) {
    e.preventDefault()
    if (!sessao) return
    setEnviando(true)
    setErro(null)
    try {
      await publicarPostFeed({
        sessaoUsuario: sessao.usuario,
        sessaoNome: sessao.nome,
        empresa: composerEmpresa,
        tipo,
        texto,
        imagem_url: imagem,
      })
      setTexto('')
      setImagem('')
      await recarregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível publicar.')
    } finally {
      setEnviando(false)
    }
  }

  async function onCurtir(post: PostFeed) {
    if (!sessao) return
    await alternarCurtida(post, sessao.usuario, sessao.nome)
    await recarregar()
  }

  async function onComentar(post: PostFeed) {
    if (!sessao) return
    try {
      await comentarPost(post, sessao.usuario, sessao.nome, rascunhoComentario)
      setRascunhoComentario('')
      await recarregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível comentar.')
    }
  }

  return (
    <div className="feed-mural">
      {mostrarComposer && sessao ? (
        <form className="feed__composer" onSubmit={onPublicar}>
          <div className="feed__composer-top">
            <span className="feed__avatar" aria-hidden>
              {iniciaisEmpresa(composerEmpresa?.nome_fantasia || sessao.nome)}
            </span>
            <div>
              <strong>{composerEmpresa?.nome_fantasia || 'Doca Livre'}</strong>
              <span>{empresaFiltro ? 'Publicar no perfil e no feed da rede' : 'Publicar para a rede do mapa'}</span>
            </div>
          </div>
          <div className="feed__tipos">
            {TIPOS_POST_FEED.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`feed__chip ${tipo === t.id ? 'is-active' : ''}`}
                onClick={() => setTipo(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Divulgue um serviço, capacidade de frota, rota ou parceria…"
            rows={4}
            maxLength={1200}
            required
          />
          <label className="feed__url">
            <ImagePlus size={16} />
            <input
              value={imagem}
              onChange={(e) => setImagem(e.target.value)}
              placeholder="URL de imagem (opcional)"
              type="url"
            />
          </label>
          {erro ? <p className="feed__erro">{erro}</p> : null}
          <button type="submit" className="feed__publicar" disabled={enviando}>
            <Send size={16} />
            {enviando ? 'Publicando…' : 'Publicar'}
          </button>
        </form>
      ) : null}

      {!empresaFiltro ? (
        <div className="feed__filtros" aria-label="Filtrar publicações">
          <button
            type="button"
            className={`feed__chip ${filtro === 'todos' ? 'is-active' : ''}`}
            onClick={() => setFiltro('todos')}
          >
            Tudo
          </button>
          {TIPOS_POST_FEED.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`feed__chip ${filtro === t.id ? 'is-active' : ''}`}
              onClick={() => setFiltro(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      <section className="feed__lista" aria-label="Publicações">
        {visiveis.length === 0 ? (
          <p className="feed__vazio">{vazio || 'Nenhuma publicação ainda.'}</p>
        ) : (
          visiveis.map((post) => {
            const emp = post.empresa_slug ? empresas.find((e) => e.slug === post.empresa_slug) : undefined
            const logo = emp ? logoSrcEmpresa(emp) : null
            const curtiu = sessao ? post.curtidas.includes(sessao.usuario) : false
            const podeApagar = sessao?.isSuper || sessao?.usuario === post.autor_usuario
            return (
              <article key={post.id} className="feed__card">
                <header className="feed__card-head">
                  <button
                    type="button"
                    className="feed__autor"
                    onClick={() => post.empresa_slug && navigate(`/empresa/${post.empresa_slug}`)}
                    disabled={!post.empresa_slug}
                  >
                    {logo ? (
                      <img src={logo} alt="" className="feed__avatar feed__avatar--img" />
                    ) : (
                      <span className="feed__avatar">{iniciaisEmpresa(post.empresa_nome)}</span>
                    )}
                    <span>
                      <strong>{post.empresa_nome}</strong>
                      <em>
                        {post.autor_nome} · {tempoRelativo(post.created_at)}
                      </em>
                    </span>
                  </button>
                  <span className="feed__tipo">{labelTipoPost(post.tipo)}</span>
                </header>
                <p className="feed__texto">{post.texto}</p>
                {post.imagem_url ? <img src={post.imagem_url} alt="" className="feed__foto" /> : null}
                <footer className="feed__acoes">
                  <button type="button" className={curtiu ? 'is-on' : ''} onClick={() => void onCurtir(post)}>
                    <Heart size={16} fill={curtiu ? 'currentColor' : 'none'} />
                    {post.curtidas.length || ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setComentarioAberto(comentarioAberto === post.id ? null : post.id)}
                  >
                    <MessageCircle size={16} />
                    {post.comentarios.length || ''}
                  </button>
                  {podeApagar ? (
                    <button
                      type="button"
                      className="feed__apagar"
                      onClick={() => void excluirPostFeed(post.id).then(recarregar)}
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </footer>
                {comentarioAberto === post.id ? (
                  <div className="feed__comentarios">
                    {post.comentarios.map((c) => (
                      <p key={c.id}>
                        <strong>{c.autor_nome}</strong> {c.texto}
                        <time>{tempoRelativo(c.created_at)}</time>
                      </p>
                    ))}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        void onComentar(post)
                      }}
                    >
                      <input
                        value={rascunhoComentario}
                        onChange={(e) => setRascunhoComentario(e.target.value)}
                        placeholder="Escreva um comentário…"
                      />
                      <button type="submit" aria-label="Enviar comentário">
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}
