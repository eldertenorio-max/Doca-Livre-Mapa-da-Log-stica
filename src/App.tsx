import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { useAuth } from './lib/AuthContext'
import { CadastroEmpresaPage } from './pages/CadastroEmpresa'
import { EmpresaPage } from './pages/Empresa'
import { FeedPage } from './pages/Feed'
import { HierarquiaPage } from './pages/Hierarquia'
import { PerfilPage } from './pages/Perfil'
import { KanbanEmpresasPage } from './pages/KanbanEmpresas'
import { LoginPage } from './pages/Login'
import { MapaPage } from './pages/Mapa'
import { PainelPage } from './pages/Painel'
import { rotaInicial } from './lib/rotasApp'

function RequireAuth() {
  const { sessao } = useAuth()
  const location = useLocation()
  if (!sessao) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

function RequireSuper() {
  const { sessao } = useAuth()
  if (!sessao?.isSuper) return <Navigate to={rotaInicial(sessao)} replace />
  return <Outlet />
}

/** Link antigo `/mapa`: visitante vai para o endereço seco; logado continua vendo aqui. */
function MapaPublicoRota() {
  const { sessao } = useAuth()
  const { search } = useLocation()
  if (!sessao) return <Navigate to={{ pathname: '/', search }} replace />
  return <MapaPage publico />
}

/** Visitante fica na raiz com o mapa; quem tem login vai para a área do sistema. */
function Inicio() {
  const { sessao } = useAuth()
  if (!sessao) return <MapaPage publico />
  return <Navigate to={rotaInicial(sessao)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroEmpresaPage />} />
      <Route path="/mapa" element={<MapaPublicoRota />} />
      <Route path="/" element={<Inicio />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/feed/notificacoes" element={<FeedPage />} />
          <Route path="/empresa/:slug" element={<EmpresaPage />} />
          <Route path="/app/mapa" element={<MapaPage />} />
          <Route element={<RequireSuper />}>
            <Route path="/painel" element={<PainelPage />} />
            <Route path="/hierarquia" element={<HierarquiaPage />} />
            <Route path="/kanban" element={<KanbanEmpresasPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
