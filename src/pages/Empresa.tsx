import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EmpresaPerfil } from '../components/empresa/EmpresaPerfil'
import { useAuth } from '../lib/AuthContext'
import { EMPRESA_DOCA_LIVRE, EMPRESA_DOCA_LIVRE_SLUG } from '../lib/empresaDocaLivre'

export function EmpresaPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { empresas, minhaEmpresa } = useAuth()
  const empresa =
    slug === EMPRESA_DOCA_LIVRE_SLUG
      ? EMPRESA_DOCA_LIVRE
      : slug
        ? empresas.find((e) => e.slug === slug)
        : undefined
  const from = params.get('from')
  const voltarTo = from === 'kanban' ? '/kanban' : from === 'hierarquia' ? '/hierarquia' : from === 'feed' ? '/feed' : '/mapa'
  const voltarLabel =
    from === 'kanban'
      ? 'Voltar ao kanban'
      : from === 'hierarquia'
        ? 'Voltar à hierarquia'
        : from === 'feed'
          ? 'Voltar ao feed'
          : 'Voltar ao mapa'
  const eDono = Boolean(minhaEmpresa && empresa && minhaEmpresa.id === empresa.id)

  if (!empresa) {
    return (
      <div className="animate-fade-up" style={{ padding: 8 }}>
        <h1>Empresa não encontrada</h1>
        <p>Esse endereço não existe no mapa atual.</p>
        <Link to={voltarTo}>{voltarLabel}</Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      {from ? (
        <p style={{ margin: '0 0 10px' }}>
          <Link to={voltarTo} style={{ fontWeight: 800, color: '#111', textDecoration: 'none' }}>
            ← {voltarLabel}
          </Link>
        </p>
      ) : null}
      <EmpresaPerfil empresa={empresa} eDono={eDono} />
    </div>
  )
}
