import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { CategoriaId, Empresa, NivelIntegracaoId, PapelHierarquia } from '../../types'
import { CATEGORIAS, NIVEIS_INTEGRACAO, SUBCATEGORIAS_POR_CATEGORIA } from '../../lib/categorias'
import { maskCnpj, somenteDigitosCnpj } from '../../lib/cnpj'
import { UFS_BR, geocodificarEndereco } from '../../lib/geo'
import { PAPEIS_HIERARQUIA } from '../../lib/orgHierarchy'
import { toggleItem } from '../../lib/search'
import { useAuth } from '../../lib/AuthContext'

function linhas(texto: string) {
  return texto
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function fontesDeTexto(texto: string): { titulo: string; url: string }[] {
  return linhas(texto).flatMap((linha) => {
    const partes = linha.split('|').map((p) => p.trim()).filter(Boolean)
    if (partes.length >= 2) {
      return [{ titulo: partes[0], url: partes.slice(1).join('|') }]
    }
    if (/^https?:\/\//i.test(linha)) {
      return [{ titulo: linha.replace(/^https?:\/\//i, '').replace(/\/$/, ''), url: linha }]
    }
    return []
  })
}

function textoDeFontes(fontes?: { titulo: string; url: string }[]) {
  if (!fontes?.length) return ''
  return fontes.map((f) => `${f.titulo} | ${f.url}`).join('\n')
}

type Props = {
  empresa: Empresa
  onCancelar: () => void
}

export function EditarPerfilEmpresa({ empresa, onCancelar }: Props) {
  const { atualizarEmpresa } = useAuth()
  const logoFileRef = useRef<HTMLInputElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [geoHint, setGeoHint] = useState<string | null>(null)

  const [logoUrl, setLogoUrl] = useState(empresa.logo_url || '')
  const [nomeFantasia, setNomeFantasia] = useState(empresa.nome_fantasia)
  const [razaoSocial, setRazaoSocial] = useState(empresa.razao_social)
  const [cnpj, setCnpj] = useState(empresa.cnpj || '')
  const [responsavelNome, setResponsavelNome] = useState(empresa.responsavel_nome || '')
  const [apresentacao, setApresentacao] = useState(empresa.apresentacao)
  const [servicosIntro, setServicosIntro] = useState(empresa.servicos_intro)
  const [servicos, setServicos] = useState(empresa.servicos.join('\n'))
  const [areaAtuacao, setAreaAtuacao] = useState(empresa.area_atuacao)
  const [cobertura, setCobertura] = useState(empresa.cobertura || '')
  const [especialidades, setEspecialidades] = useState(empresa.especialidades.join('\n'))
  const [referencias, setReferencias] = useState(empresa.referencias || '')
  const [tags, setTags] = useState(empresa.tags.join('\n'))
  const [fontes, setFontes] = useState(textoDeFontes(empresa.fontes))
  const [telefone, setTelefone] = useState(empresa.telefone || '')
  const [email, setEmail] = useState(empresa.email || '')
  const [siteUrl, setSiteUrl] = useState(empresa.site_url || '')
  const [endereco, setEndereco] = useState(empresa.endereco)
  const [numero, setNumero] = useState(empresa.numero || '')
  const [bairro, setBairro] = useState(empresa.bairro || '')
  const [cidade, setCidade] = useState(empresa.cidade)
  const [uf, setUf] = useState(empresa.uf)
  const [cep, setCep] = useState(empresa.cep || '')
  const [lat, setLat] = useState(String(empresa.lat))
  const [lng, setLng] = useState(String(empresa.lng))
  const [categoria, setCategoria] = useState<CategoriaId>(empresa.categoria)
  const [subcategorias, setSubcategorias] = useState<string[]>(empresa.subcategorias)
  const [nivelIntegracao, setNivelIntegracao] = useState<NivelIntegracaoId | ''>(empresa.nivel_integracao || '')
  const [papelHierarquia, setPapelHierarquia] = useState<PapelHierarquia | ''>(empresa.papel_hierarquia || '')

  const subsOpcoes = SUBCATEGORIAS_POR_CATEGORIA[categoria] ?? []

  useEffect(() => {
    setLogoUrl(empresa.logo_url || '')
    setNomeFantasia(empresa.nome_fantasia)
    setRazaoSocial(empresa.razao_social)
    setCnpj(empresa.cnpj || '')
    setResponsavelNome(empresa.responsavel_nome || '')
    setApresentacao(empresa.apresentacao)
    setServicosIntro(empresa.servicos_intro)
    setServicos(empresa.servicos.join('\n'))
    setAreaAtuacao(empresa.area_atuacao)
    setCobertura(empresa.cobertura || '')
    setEspecialidades(empresa.especialidades.join('\n'))
    setReferencias(empresa.referencias || '')
    setTags(empresa.tags.join('\n'))
    setFontes(textoDeFontes(empresa.fontes))
    setTelefone(empresa.telefone || '')
    setEmail(empresa.email || '')
    setSiteUrl(empresa.site_url || '')
    setEndereco(empresa.endereco)
    setNumero(empresa.numero || '')
    setBairro(empresa.bairro || '')
    setCidade(empresa.cidade)
    setUf(empresa.uf)
    setCep(empresa.cep || '')
    setLat(String(empresa.lat))
    setLng(String(empresa.lng))
    setCategoria(empresa.categoria)
    setSubcategorias(empresa.subcategorias)
    setNivelIntegracao(empresa.nivel_integracao || '')
    setPapelHierarquia(empresa.papel_hierarquia || '')
    setErro(null)
    setOk(null)
    setGeoHint(null)
  }, [empresa])

  function onLogoFile(file: File | null) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      setErro('Logo: use JPG, PNG ou WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro('Logo: tamanho máximo 5MB.')
      return
    }
    setErro(null)
    const reader = new FileReader()
    reader.onload = () => setLogoUrl(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  async function atualizarPontoNoMapa() {
    if (!cidade.trim() || !uf) {
      setGeoHint('Informe cidade e estado para posicionar o pin.')
      return
    }
    setGeoHint('Buscando o ponto no mapa…')
    const geo = await geocodificarEndereco({
      endereco: [endereco, numero, bairro].filter(Boolean).join(', '),
      cidade: cidade.trim(),
      uf,
    })
    setLat(String(geo.lat))
    setLng(String(geo.lng))
    setGeoHint('Pin atualizado pelo endereço.')
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setOk(null)
    if (!nomeFantasia.trim()) {
      setErro('Informe o nome fantasia.')
      return
    }
    if (!razaoSocial.trim()) {
      setErro('Informe a razão social.')
      return
    }
    if (!cidade.trim() || !uf) {
      setErro('Informe cidade e estado.')
      return
    }
    const digits = somenteDigitosCnpj(cnpj)
    if (digits.length > 0 && digits.length !== 14) {
      setErro('CNPJ incompleto. Deixe em branco ou informe os 14 dígitos.')
      return
    }
    const latN = Number(lat.replace(',', '.'))
    const lngN = Number(lng.replace(',', '.'))
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      setErro('Latitude e longitude precisam ser números.')
      return
    }

    const listaServicos = linhas(servicos)
    const listaEsp = linhas(especialidades)
    const listaTags = linhas(tags)

    const next: Empresa = {
      ...empresa,
      logo_url: logoUrl.trim() || undefined,
      nome_fantasia: nomeFantasia.trim(),
      razao_social: razaoSocial.trim(),
      cnpj: digits.length === 14 ? maskCnpj(cnpj) : undefined,
      responsavel_nome: responsavelNome.trim() || undefined,
      apresentacao: apresentacao.trim(),
      servicos_intro: servicosIntro.trim(),
      servicos: listaServicos,
      area_atuacao: areaAtuacao.trim(),
      cobertura: cobertura.trim() || undefined,
      especialidades: listaEsp,
      referencias: referencias.trim() || undefined,
      tags: listaTags.length ? listaTags : empresa.tags,
      fontes: fontesDeTexto(fontes).length ? fontesDeTexto(fontes) : undefined,
      telefone: telefone.trim() || undefined,
      email: email.trim() || undefined,
      site_url: siteUrl.trim() || undefined,
      endereco: endereco.trim() || cidade.trim(),
      numero: numero.trim() || undefined,
      bairro: bairro.trim() || undefined,
      cidade: cidade.trim(),
      uf,
      cep: cep.trim() || undefined,
      lat: latN,
      lng: lngN,
      categoria,
      subcategorias,
      nivel_integracao: nivelIntegracao || undefined,
      papel_hierarquia: papelHierarquia || empresa.papel_hierarquia,
    }

    setSalvando(true)
    setErro(null)
    try {
      await atualizarEmpresa(next)
      setOk('Página de apresentação salva.')
      onCancelar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form className="tv-perfil-form" onSubmit={onSubmit}>
      <div className="tv-perfil-form__head">
        <div>
          <h2>Editar página de apresentação</h2>
          <p>Altere logo, textos, contato, endereço e categorias. O endereço da página ({empresa.slug}) permanece o mesmo.</p>
        </div>
      </div>

      <fieldset className="tv-perfil-form__bloco">
        <legend>Identidade</legend>
        <div className="tv-perfil-form__logo-row">
          {logoUrl ? (
            <img className="tv-perfil-form__logo" src={logoUrl} alt="" />
          ) : (
            <div className="tv-perfil-form__logo tv-perfil-form__logo--empty" aria-hidden>
              {(nomeFantasia || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="tv-perfil-form__logo-fields">
            <label>
              URL da logo
              <input value={logoUrl.startsWith('data:') ? '' : logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
            </label>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
            />
            <button type="button" className="tv-perfil__btn tv-perfil__btn--ghost" onClick={() => logoFileRef.current?.click()}>
              Enviar arquivo
            </button>
          </div>
        </div>
        <div className="tv-perfil-form__grid">
          <label>
            Nome fantasia
            <input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} required />
          </label>
          <label>
            Razão social
            <input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} required />
          </label>
          <label>
            CNPJ
            <input value={cnpj} onChange={(e) => setCnpj(maskCnpj(e.target.value))} placeholder="Somente se a empresa tiver" />
          </label>
          <label>
            Responsável
            <input value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset className="tv-perfil-form__bloco">
        <legend>Apresentação</legend>
        <label>
          Texto de apresentação
          <textarea rows={5} value={apresentacao} onChange={(e) => setApresentacao(e.target.value)} />
        </label>
        <label>
          Introdução dos serviços
          <textarea rows={2} value={servicosIntro} onChange={(e) => setServicosIntro(e.target.value)} />
        </label>
        <label>
          Serviços (um por linha)
          <textarea rows={6} value={servicos} onChange={(e) => setServicos(e.target.value)} />
        </label>
        <div className="tv-perfil-form__grid">
          <label>
            Área de atuação
            <input value={areaAtuacao} onChange={(e) => setAreaAtuacao(e.target.value)} />
          </label>
          <label>
            Cobertura
            <input value={cobertura} onChange={(e) => setCobertura(e.target.value)} placeholder="Estados, regiões, rotas…" />
          </label>
        </div>
        <label>
          Especialidades (uma por linha)
          <textarea rows={4} value={especialidades} onChange={(e) => setEspecialidades(e.target.value)} />
        </label>
        <label>
          Referências
          <textarea rows={3} value={referencias} onChange={(e) => setReferencias(e.target.value)} />
        </label>
        <label>
          Tags (uma por linha)
          <textarea rows={3} value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <label>
          Fontes públicas (título | url, uma por linha)
          <textarea rows={3} value={fontes} onChange={(e) => setFontes(e.target.value)} placeholder="Site oficial | https://…" />
        </label>
      </fieldset>

      <fieldset className="tv-perfil-form__bloco">
        <legend>Categoria no mapa</legend>
        <div className="tv-perfil-form__cats">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`tv-perfil-form__cat${categoria === c.id ? ' is-on' : ''}`}
              onClick={() => {
                setCategoria(c.id)
                setSubcategorias((atual) => atual.filter((s) => (SUBCATEGORIAS_POR_CATEGORIA[c.id] ?? []).includes(s)))
              }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        {subsOpcoes.length > 0 ? (
          <div className="tv-perfil-form__subs">
            {subsOpcoes.map((s) => (
              <label key={s} className="tv-perfil-form__check">
                <input
                  type="checkbox"
                  checked={subcategorias.includes(s)}
                  onChange={() => setSubcategorias((atual) => toggleItem(atual, s))}
                />
                {s}
              </label>
            ))}
          </div>
        ) : null}
        <label>
          Nível de integração
          <select value={nivelIntegracao} onChange={(e) => setNivelIntegracao((e.target.value || '') as NivelIntegracaoId | '')}>
            <option value="">Não informado</option>
            {NIVEIS_INTEGRACAO.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Papel na hierarquia
          <select value={papelHierarquia} onChange={(e) => setPapelHierarquia((e.target.value || '') as PapelHierarquia | '')}>
            <option value="">Não informado</option>
            {PAPEIS_HIERARQUIA.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className="tv-perfil-form__bloco">
        <legend>Contato e endereço</legend>
        <div className="tv-perfil-form__grid">
          <label>
            Telefone / WhatsApp
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </label>
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Site
            <input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://…" />
          </label>
          <label>
            CEP
            <input value={cep} onChange={(e) => setCep(e.target.value)} />
          </label>
          <label className="tv-perfil-form__span2">
            Endereço
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </label>
          <label>
            Número
            <input value={numero} onChange={(e) => setNumero(e.target.value)} />
          </label>
          <label>
            Bairro
            <input value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </label>
          <label>
            Cidade
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} required />
          </label>
          <label>
            Estado
            <select value={uf} onChange={(e) => setUf(e.target.value)} required>
              <option value="">UF</option>
              {UFS_BR.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label>
            Latitude
            <input value={lat} onChange={(e) => setLat(e.target.value)} />
          </label>
          <label>
            Longitude
            <input value={lng} onChange={(e) => setLng(e.target.value)} />
          </label>
        </div>
        <button type="button" className="tv-perfil__btn tv-perfil__btn--ghost" onClick={() => void atualizarPontoNoMapa()}>
          Atualizar pin pelo endereço
        </button>
        {geoHint ? <p className="tv-perfil-form__hint">{geoHint}</p> : null}
      </fieldset>

      {erro ? <p className="tv-perfil-form__erro">{erro}</p> : null}
      {ok ? <p className="tv-perfil-form__ok">{ok}</p> : null}

      <div className="tv-perfil-form__acoes">
        <button type="submit" className="tv-perfil__btn" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar página'}
        </button>
        <button type="button" className="tv-perfil__btn tv-perfil__btn--ghost" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
