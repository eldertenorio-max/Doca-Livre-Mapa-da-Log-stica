import { NavLink } from 'react-router-dom'
import { Newspaper, UserRound } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'

export function RedeAbas() {
  const { minhaEmpresa } = useAuth()

  return (
    <div className="feed__tabs" role="tablist" aria-label="Perfil e feed">
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
    </div>
  )
}
