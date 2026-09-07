import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EmpresaPerfil } from '../components/empresa/EmpresaPerfil'
import { useAuth } from '../lib/AuthContext'
import { LOGO_DOCA_LIVRE_SRC } from '../lib/brandAssets'

export function EmpresaPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { empresas } = useAuth()
  const empresa = slug ? empresas.find((e) => e.slug === slug) : undefined
  const from = params.get('from')
  const voltarTo = from === 'kanban' ? '/kanban' : from === 'hierarquia' ? '/hierarquia' : '/mapa'
  const voltarLabel =
    from === 'kanban' ? 'Voltar ao kanban' : from === 'hierarquia' ? 'Voltar à hierarquia' : 'Voltar ao mapa'

  if (!empresa) {
    return (
      <div className="animate-fade-up" style={{ padding: 24 }}>
        <h1>Empresa não encontrada</h1>
        <p>Esse endereço não existe no mapa atual.</p>
        <Link to={voltarTo}>{voltarLabel}</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#fff' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: 52,
          padding: '0 16px',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          background: '#fff',
          zIndex: 20,
        }}
      >
        <img src={LOGO_DOCA_LIVRE_SRC} alt="Doca Livre" style={{ height: 28 }} />
        <strong style={{ fontSize: '0.9rem', fontWeight: 800 }}>Mapa da Logística</strong>
        <Link
          to={voltarTo}
          style={{
            marginLeft: 'auto',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: '#0f172a',
            textDecoration: 'none',
            border: '1px solid #d0d7de',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          {voltarLabel}
        </Link>
      </header>
      <EmpresaPerfil empresa={empresa} />
    </div>
  )
}
