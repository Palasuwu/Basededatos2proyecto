import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBoards, getStats } from '../api'

function StatCard({ label, value, color = 'var(--green)', delay = 0 }: any) {
  return (
    <div className="glass glow-hover fade-up rounded-xl p-5" style={{ animationDelay: `${delay}ms`, opacity: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace",
                    lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

export default function Home() {
  const [boards,  setBoards]  = useState<any[]>([])
  const [stats,   setStats]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getBoards(), getStats()]).then(([b, s]) => {
      setBoards(b); setStats(s); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '32px 0' }}>
      <div className="skeleton" style={{ height: 120, borderRadius: 12 }}/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }}/>)}
      </div>
    </div>
  )

  return (
    <div>
      {/* Hero */}
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1, marginBottom: 8 }}>
          <span className="grad-title" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            /chan/db
          </span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
          Neo4j · {boards.length} boards · {stats?.total_nodes?.toLocaleString()} nodes
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          <StatCard label="Total Nodes"   value={stats.total_nodes?.toLocaleString()} delay={0}/>
          <StatCard label="Relationships" value={stats.total_rels?.toLocaleString()}  color="var(--blue)"   delay={50}/>
          <StatCard label="Boards"        value={boards.length}                        color="var(--purple)" delay={100}/>
          <StatCard label="Isolated"      value={stats.isolated_nodes}
            color={stats.isolated_nodes > 0 ? 'var(--red)' : 'var(--green)'} delay={150}/>
        </div>
      )}

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span className="section-label">Board Index</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{boards.length} boards</span>
      </div>

      {/* Board grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 40 }}>
        {boards.map((b: any, i: number) => (
          <Link key={b.id} to={`/board/${b.slug}`} style={{ textDecoration: 'none' }}>
            <div className="glass glow-hover fade-up rounded-xl p-5"
              style={{ opacity: 0, animationDelay: `${i * 30}ms`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)',
                                 fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.01em' }}>
                    /{b.slug}/
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{b.name}</span>
                </div>
                {b.nsfw && (
                  <span className="tag-pill" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--red)',
                                                       border: '1px solid rgba(248,113,113,0.25)' }}>NSFW</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {b.description}
              </p>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--faint)',
                            fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{b.post_count?.toLocaleString() ?? 0} posts</span>
                <span style={{ marginLeft: 'auto', color: 'var(--green)', opacity: 0.6 }}>→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Node distribution */}
      {stats?.nodes_by_label && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span className="section-label">Node Distribution</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
          </div>
          <div className="glass rounded-xl p-6">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              {stats.nodes_by_label.map((row: any, i: number) => {
                const pct = Math.round((row.count / stats.total_nodes) * 100)
                const hue = (i * 47) % 360
                return (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                    <span style={{ width: 72, fontSize: 11, textAlign: 'right', flexShrink: 0,
                                   color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {row.label}
                    </span>
                    <div className="bar-track" style={{ flex: 1, height: 6 }}>
                      <div className="bar-fill" style={{
                        width: `${pct}%`, height: '100%',
                        background: `hsl(${hue}, 100%, 65%)`,
                        opacity: 0.75,
                      }}/>
                    </div>
                    <span style={{ width: 44, fontSize: 11, textAlign: 'right', flexShrink: 0,
                                   fontFamily: "'JetBrains Mono', monospace",
                                   color: `hsl(${hue}, 100%, 70%)` }}>
                      {row.count.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
