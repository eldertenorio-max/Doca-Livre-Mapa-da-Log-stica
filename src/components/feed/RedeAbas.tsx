import { useEffect, useState } from 'react'
import { Bell, Newspaper, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { contarNotificacoesNaoLidas } from '../../lib/feedStore'

type Props = {
  naoLidas?: number
}

export function RedeAbas({ naoLidas }: Props) {
  const { sessao, minhaEmpresa } = useAuth()
  const [internas, setInternas] = useState(0)
  const badge = naoLidas ?? internas

  useEffect(() => {
    if (naoLidas != null || !sessao?.usuario) return
    let ativo = true
    void contarNotificacoesNaoLidas(sessao.usuario).then((n) => {
      if (ativo) setInternas(n)
    })
    return () => {
      ativo = false
    }
  }, [naoLidas, sessao?.usuario])

  return (
    <div className="feed__tabs" role="tablist" aria-label="Perfil, feed e notificações">
      {minhaEmpresa ? (
        <NavLink to="/perfil" className={({ isActive }) => `feed__tab ${isActive ? 'is-active' : ''}`}>
          <UserRound size={16} />
          Meu perfil
        </NavLink>
      ) : null}
      <NavLink
        to="/feed"
        end
        className={({ isActive }) => `feed__tab ${isActive ? 'is-active' : ''}`}
      >
        <Newspaper size={16} />
        Feed notícias
      </NavLink>
      <NavLink
        to="/feed/notificacoes"
        className={({ isActive }) => `feed__tab ${isActive ? 'is-active' : ''}`}
      >
        <Bell size={16} />
        Notificações
        {badge > 0 ? <span className="feed__badge">{badge}</span> : null}
      </NavLink>
    </div>
  )
}
