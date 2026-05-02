import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStats } from '../api'

function AnimatedNumber({ target }: { target: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    const dur = 1200, step = 16
    const inc = target / (dur / step)
    let cur = 0
    const t = setInterval(() => {
      cur = Math.min(cur + inc, target)
      setVal(Math.round(cur))
      if (cur >= target) clearInterval(t)
    }, step)
    return () => clearInterval(t)
  }, [target])
  return <>{val.toLocaleString()}</>
}

const FEATURES = [
  {
    to: '/boards',
    icon: '◈',
    color: 'var(--green)',
    title: 'Board Index',
    desc: 'Browse 10 boards temáticos con miles de threads y posts. Filtra, explora y participa.',
    badge: 'Explore',
  },
  {
    to: '/admin',
    icon: '⚙',
    color: 'var(--blue)',
    title: 'Admin Panel',
    desc: 'CRUD completo: nodos, propiedades y relaciones. Todas las operaciones de la rúbrica.',
    badge: 'CRUD',
  },
  {
    to: '/analytics',
    icon: '◉',
    color: 'var(--purple)',
    title: 'Analytics',
    desc: '9 consultas Cypher en vivo con PageRank GDS. Detección de fraude, influencia y más.',
    badge: 'Queries',
  },
  {
    to: '/demo',
    icon: '▶',
    color: 'var(--yellow)',
    title: 'Demo Guiado',
    desc: 'Flujo paso a paso para la presentación. IDs reales pre-cargados, resultados en vivo.',
    badge: 'Presentación',
  },
]

const TEAM = [
  { name: 'Adrián González', id: '23152',  queries: 'Q1: Suspicious IPs · Q2: Board Stats',  color: 'var(--green)'  },
  { name: 'Jorge Palacios',  id: '231385', queries: 'Q3: Active Threads · Q4: Quote Chains', color: 'var(--blue)'   },
  { name: 'Wilson Calderón', id: '22018',  queries: 'Q5: Influential Users · Q6 · Q7',       color: 'var(--purple)' },
]

const STACK = [
  { name: 'Neo4j 2026',  color: '#00ff88', sub: 'Enterprise · Graph DB'    },
  { name: 'FastAPI',     color: '#60a5fa', sub: 'Python · REST API'         },
  { name: 'React 18',    color: '#c084fc', sub: 'TypeScript · Vite'         },
  { name: 'GDS Plugin',  color: '#fbbf24', sub: 'PageRank · Betweenness'    },
]

export default function Landing() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => { getStats().then(setStats).catch(() => {}) }, [])

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '60px 0 48px', position: 'relative' }}>
        {/* background glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,255,136,0.07) 0%, transparent 70%)',
        }}/>

        <div className="fade-up" style={{ position: 'relative' }}>
          <span style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 999,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            background: 'rgba(0,255,136,0.08)', color: 'var(--green)',
            border: '1px solid rgba(0,255,136,0.2)', marginBottom: 20,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            CC3089 Base de Datos 2 · UVG · Grupo 8
          </span>

          <h1 style={{ fontSize: 'clamp(36px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.05,
                       margin: '0 0 20px', letterSpacing: '-0.03em' }}>
            <span className="grad-title" style={{ fontFamily: "'JetBrains Mono', monospace", display: 'block' }}>
              /chan/db
            </span>
            <span style={{ color: 'var(--text)', fontSize: '0.45em', fontWeight: 400,
                           fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em', display: 'block', marginTop: 8 }}>
              Plataforma de foros sobre grafo Neo4j
            </span>
          </h1>

          <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.65 }}>
            7,775 nodos · 19,634 relaciones · 11 labels · 15 tipos de relación.
            Diseñado para demostrar CRUD completo, consultas Cypher avanzadas y PageRank.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/boards" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ fontSize: 14, padding: '11px 28px' }}>
                Explorar Boards →
              </button>
            </Link>
            <Link to="/demo" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost" style={{ fontSize: 14, padding: '11px 28px',
                                                      border: '1px solid rgba(251,191,36,0.3)',
                                                      color: 'var(--yellow)' }}>
                ▶ Demo Guiado
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────── */}
      {stats && (
        <div className="glass rounded-2xl fade-up anim-delay-1" style={{ padding: '20px 28px', marginBottom: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 0 }}>
            {[
              { label: 'Nodos',         val: stats.total_nodes, color: 'var(--green)'  },
              { label: 'Relaciones',    val: stats.total_rels,  color: 'var(--blue)'   },
              { label: 'Labels',        val: stats.nodes_by_label?.length, color: 'var(--purple)' },
              { label: 'Boards',        val: 10,                color: 'var(--yellow)' },
              { label: 'Aislados',      val: stats.isolated_nodes,
                color: stats.isolated_nodes > 0 ? 'var(--red)' : 'var(--green)' },
            ].map((s, i) => (
              <div key={s.label} style={{
                textAlign: 'center', padding: '12px 8px',
                borderRight: i < 4 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1,
                               fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>
                  <AnimatedNumber target={s.val ?? 0}/>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Features ─────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span className="section-label">Secciones</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {FEATURES.map((f, i) => (
            <Link key={f.to} to={f.to} style={{ textDecoration: 'none' }}>
              <div className="glass glow-hover rounded-xl fade-up"
                style={{ padding: '22px', opacity: 0, animationDelay: `${i * 60}ms`,
                         cursor: 'pointer', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex',
                                 alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                 background: `${f.color}12`, color: f.color,
                                 border: `1px solid ${f.color}22` }}>
                    {f.icon}
                  </div>
                  <span className="tag-pill" style={{ background: `${f.color}10`,
                    color: f.color, border: `1px solid ${f.color}25`, fontSize: 10 }}>
                    {f.badge}
                  </span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>
                  {f.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Team + Stack ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>

        {/* Team */}
        <div className="glass rounded-xl" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span className="section-label">Equipo</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TEAM.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex',
                               alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                               background: `${m.color}10`, color: m.color,
                               border: `1px solid ${m.color}20`, fontSize: 13, fontWeight: 700,
                               fontFamily: "'JetBrains Mono', monospace" }}>
                  {m.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                    {m.name}
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)',
                                   fontFamily: "'JetBrains Mono', monospace" }}>#{m.id}</span>
                  </div>
                  <div style={{ fontSize: 11, color: m.color, opacity: 0.8 }}>{m.queries}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stack */}
        <div className="glass rounded-xl" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span className="section-label">Stack</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STACK.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12,
                                         padding: '10px 12px', borderRadius: 8,
                                         background: 'rgba(255,255,255,0.025)',
                                         border: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color,
                               boxShadow: `0 0 6px ${s.color}`, flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)',
                                 fontFamily: "'JetBrains Mono', monospace" }}>{s.name}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{s.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
