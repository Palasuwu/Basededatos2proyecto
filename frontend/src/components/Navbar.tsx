import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/',           label: 'Inicio',     icon: '⌂'  },
  { to: '/boards',     label: 'Boards',     icon: '◈'  },
  { to: '/admin',      label: 'Admin',      icon: '⚙'  },
  { to: '/analytics',  label: 'Analytics',  icon: '◉'  },
  { to: '/demo',       label: 'Demo',       icon: '▶', highlight: true },
]

export default function Navbar() {
  const loc = useLocation()
  return (
    <nav style={{
      background: 'rgba(5, 10, 8, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(0,255,136,0.08)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px',
                    display: 'flex', alignItems: 'center', height: 52, gap: 4 }}>

        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center',
                               marginRight: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16 }}>
            <span className="grad-green" style={{ fontFamily: 'inherit' }}>/chan/</span>
            <span style={{ color: 'var(--text)', fontFamily: 'inherit' }}>db</span>
          </span>
        </Link>

        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {links.map(l => {
            const active = loc.pathname === l.to ||
              (l.to !== '/' && l.to !== '/demo' && loc.pathname.startsWith(l.to))
            const isDemo = l.to === '/demo'
            return (
              <Link key={l.to} to={l.to} style={{ textDecoration: 'none' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  transition: 'all 0.18s',
                  color: active ? (isDemo ? 'var(--yellow)' : 'var(--green)') : 'var(--muted)',
                  background: active
                    ? (isDemo ? 'rgba(251,191,36,0.1)' : 'rgba(0,255,136,0.08)')
                    : 'transparent',
                  border: `1px solid ${active
                    ? (isDemo ? 'rgba(251,191,36,0.25)' : 'rgba(0,255,136,0.2)')
                    : 'transparent'}`,
                }}>
                  <span style={{ fontSize: 10, opacity: 0.75 }}>{l.icon}</span>
                  {l.label}
                </span>
              </Link>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                         color: 'var(--faint)', letterSpacing: '0.06em', display: 'none' }}
            className="md-show">
            Neo4j 2026 Enterprise
          </span>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--green)', boxShadow: '0 0 6px var(--green)',
            display: 'inline-block', animation: 'pulse-glow 2s ease infinite',
          }}/>
        </div>
      </div>
    </nav>
  )
}
