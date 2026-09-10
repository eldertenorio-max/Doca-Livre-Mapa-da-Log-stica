import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/AuthContext'
import './index.css'

const BUILD_ID = 'mapa-paywall-pin-v1'

async function forceFreshOnce(): Promise<boolean> {
  const key = `doca-build:${BUILD_ID}`
  try {
    if (localStorage.getItem(key) === 'ok') return false
  } catch {
    /* ignore */
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  } catch {
    /* ignore */
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* ignore */
  }

  try {
    localStorage.setItem(key, 'ok')
  } catch {
    /* ignore */
  }

  try {
    if (sessionStorage.getItem(`reloaded:${BUILD_ID}`)) return false
    sessionStorage.setItem(`reloaded:${BUILD_ID}`, '1')
  } catch {
    /* continue */
  }

  const u = new URL(window.location.href)
  u.searchParams.set('_v', BUILD_ID)
  window.location.replace(u.toString())
  return true
}

/** Endereço sem `?_v` e sem `#/`, aceitando os links antigos com hash. */
function enderecoLimpo(): string | null {
  const u = new URL(window.location.href)
  let mudou = u.searchParams.has('_v')
  u.searchParams.delete('_v')

  if (u.hash.startsWith('#/')) {
    const rota = new URL(u.hash.slice(1), window.location.origin)
    u.pathname = rota.pathname
    for (const [chave, valor] of rota.searchParams) u.searchParams.set(chave, valor)
    u.hash = ''
    mudou = true
  }

  return mudou ? `${u.pathname}${u.search}` : null
}

function boot() {
  const limpo = enderecoLimpo()
  if (limpo) window.history.replaceState(null, '', limpo)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}

void forceFreshOnce().then((reloading) => {
  if (!reloading) boot()
})

