import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { useAuth } from './lib/AuthContext'
import { CadastroEmpresaPage } from './pages/CadastroEmpresa'
import { EmpresaPage } from './pages/Empresa'
import { HierarquiaPage } from './pages/Hierarquia'
import { KanbanEmpresasPage } from './pages/KanbanEmpresas'
import { LoginPage } from './pages/Login'
import { MapaPage } from './pages/Mapa'
import { PainelPage } from './pages/Painel'

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
  if (!sessao?.isSuper) return <Navigate to="/mapa" replace />
  return <Outlet />
}

function Inicio() {
  const { sessao } = useAuth()
  return <Navigate to={sessao?.isSuper ? '/painel' : '/mapa'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroEmpresaPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/empresa/:slug" element={<EmpresaPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/mapa" element={<MapaPage />} />
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
