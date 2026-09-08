import { EmpresaPerfil } from '../components/empresa/EmpresaPerfil'
import { RedeAbas } from '../components/feed/RedeAbas'
import { useAuth } from '../lib/AuthContext'
import '../styles/feed.css'

export function PerfilPage() {
  const { minhaEmpresa } = useAuth()

  if (!minhaEmpresa) {
    return (
      <div className="feed animate-fade-up">
        <h1>Meu perfil</h1>
        <p>Complete o cadastro da empresa para ter um perfil na rede.</p>
      </div>
    )
  }

  return (
    <div className="feed animate-fade-up">
      <header className="feed__hero">
        <div>
          <p className="feed__kicker">Doca Livre · Rede</p>
          <h1>Meu perfil</h1>
          <p>Dados da sua operação e todas as publicações que você fez no feed.</p>
        </div>
      </header>
      <RedeAbas />
      <EmpresaPerfil empresa={minhaEmpresa} eDono />
    </div>
  )
}
