import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  getStats, getSuspiciousIPs, getActiveThreads, getQuoteChains,
  getTopUsers, getUnmodBoards, getReportsDist, getPageRank, getBoardStats2
} from '../api'

const QUERIES = [
  { key: 'stats',       label: 'Global Stats',              sub: 'Q0 · All members',  member: 'all',    fn: getStats,         color: '#6b7a6e' },
  { key: 'board-stats', label: 'Board Stats (Aggregation)', sub: 'Q1 · Adrián',       member: 'Adrián', fn: getBoardStats2,   color: '#00ff88' },
  { key: 'suspicious',  label: 'Suspicious IPs',            sub: 'Q2 · Adrián',       member: 'Adrián', fn: getSuspiciousIPs, color: '#00ff88' },
  { key: 'active',      label: 'Active Threads (24h)',      sub: 'Q3 · Jorge',        member: 'Jorge',  fn: getActiveThreads, color: '#60a5fa' },
  { key: 'chains',      label: 'Quote Chains',              sub: 'Q4 · Jorge',        member: 'Jorge',  fn: getQuoteChains,   color: '#60a5fa' },
  { key: 'top-users',   label: 'Influential Users',         sub: 'Q5 · Wilson',       member: 'Wilson', fn: getTopUsers,      color: '#fbbf24' },
  { key: 'unmoderated', label: 'Unmoderated Boards',        sub: 'Q6 · Wilson',       member: 'Wilson', fn: getUnmodBoards,   color: '#fbbf24' },
  { key: 'reports',     label: 'Reports Distribution',      sub: 'Q7 · Wilson',       member: 'Wilson', fn: getReportsDist,   color: '#fbbf24' },
  { key: 'pagerank',    label: 'PageRank',                  sub: 'Q8 · GDS +10 pts',  member: 'extra',  fn: getPageRank,      color: '#c084fc' },
]

export default function AnalyticsPage() {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const run = async (key: string, fn: () => Promise<any>) => {
    setLoading(l => ({...l, [key]: true}))
    try {
      const data = await fn()
      setResults(r => ({...r, [key]: data}))
    } catch { toast.error('Query failed') }
    setLoading(l => ({...l, [key]: false}))
  }

  const runAll = () => QUERIES.forEach(q => run(q.key, q.fn))
  const anyLoading = Object.values(loading).some(Boolean)

  return (
    <div>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>
            <span className="grad-green" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Analytics</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            Live Neo4j queries · 9 queries · {Object.keys(results).length} run
          </p>
        </div>
        <button onClick={runAll} disabled={anyLoading} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {anyLoading ? (
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                           border: '2px solid #050a08', borderTopColor: 'transparent',
                           animation: 'spin 0.7s linear infinite' }}/>
          ) : '▶'}
          Run All
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {QUERIES.map(({ key, label, sub, fn, color }, i) => {
          const hasResult = key in results
          return (
            <div key={key} className="glass rounded-xl fade-up"
              style={{ opacity: 0, animationDelay: `${i * 40}ms`, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                            borderBottom: hasResult ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 3, height: 32, borderRadius: 2, background: color, flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{sub}</div>
                </div>
                {hasResult && (
                  <span style={{ fontSize: 11, color: color, background: `${color}15`,
                                 padding: '2px 8px', borderRadius: 999, border: `1px solid ${color}30`,
                                 fontFamily: "'JetBrains Mono', monospace" }}>
                    ✓ done
                  </span>
                )}
                <button onClick={() => run(key, fn)} disabled={loading[key]}
                  style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                           cursor: loading[key] ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                           background: loading[key] ? 'rgba(255,255,255,0.04)' : `${color}14`,
                           color: loading[key] ? 'var(--muted)' : color,
                           border: `1px solid ${loading[key] ? 'var(--border)' : color + '30'}`,
                           display: 'flex', alignItems: 'center', gap: 6 }}>
                  {loading[key] ? (
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                                   border: `2px solid ${color}44`, borderTopColor: color,
                                   animation: 'spin 0.7s linear infinite' }}/>
                  ) : '▶'}
                  {loading[key] ? 'Running' : 'Run'}
                </button>
              </div>

              {/* Results */}
              {hasResult && (
                <div style={{ padding: '16px 18px', background: 'rgba(0,0,0,0.2)' }}>
                  <ResultView data={results[key]} queryKey={key}/>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultView({ data, queryKey }: { data: any; queryKey: string }) {
  if (!data) return null
  if (queryKey === 'stats')    return <StatsView data={data}/>
  if (queryKey === 'pagerank') return <PageRankView data={data}/>
  if (queryKey === 'chains')   return <ChainsView data={data}/>
  if (!Array.isArray(data) || data.length === 0)
    return <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>No results returned.</p>

  const keys = Object.keys(data[0])
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
      <table className="data-table">
        <thead>
          <tr>{keys.map(k => <th key={k}>{k}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row: any, i: number) => (
            <tr key={i}>
              {keys.map(k => (
                <td key={k}>
                  {Array.isArray(row[k])
                    ? (typeof row[k][0] === 'object' ? JSON.stringify(row[k]).slice(0,80) : row[k].join(', '))
                    : String(row[k] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatsView({ data }: any) {
  const stats = [
    { label: 'Total Nodes',   value: data.total_nodes?.toLocaleString(), color: 'var(--green)' },
    { label: 'Relationships', value: data.total_rels?.toLocaleString(),  color: 'var(--blue)'  },
    { label: 'Labels',        value: data.nodes_by_label?.length,        color: 'var(--purple)'},
    { label: 'Isolated',      value: data.isolated_nodes,
      color: data.isolated_nodes > 0 ? 'var(--red)' : 'var(--green)' },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
        {stats.map(s => (
          <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px',
            background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color,
                          fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
        {data.nodes_by_label?.map((row: any, i: number) => {
          const pct = Math.round((row.count / data.total_nodes) * 100)
          const hue = (i * 47) % 360
          return (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 64, fontSize: 10, textAlign: 'right', flexShrink: 0,
                             color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                {row.label}
              </span>
              <div className="bar-track" style={{ flex: 1, height: 5 }}>
                <div className="bar-fill" style={{ width: `${pct}%`, height: '100%', background: `hsl(${hue},100%,65%)`, opacity: 0.7 }}/>
              </div>
              <span style={{ width: 40, fontSize: 10, textAlign: 'right', flexShrink: 0,
                             color: `hsl(${hue},100%,70%)`, fontFamily: "'JetBrains Mono', monospace" }}>
                {row.count.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PageRankView({ data }: any) {
  if (data.status === 'gds_not_installed') return (
    <div style={{ padding: '16px', borderRadius: 8, background: 'rgba(248,113,113,0.05)',
                  border: '1px solid rgba(248,113,113,0.2)' }}>
      <p style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 8, marginTop: 0, fontSize: 13 }}>
        GDS Plugin Required
      </p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, marginTop: 0 }}>{data.message}</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
        Neo4j Desktop → your DBMS →{' '}
        <strong style={{ color: 'var(--text)' }}>Plugins</strong> tab →
        install <strong style={{ color: 'var(--green)' }}>Graph Data Science Library</strong> → Restart DBMS
      </p>
    </div>
  )
  if (!data.results?.length) return <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>No results</p>
  const max = data.results[0]?.pagerank || 1
  return (
    <div>
      <p style={{ fontSize: 11, color: 'var(--purple)', marginBottom: 12, marginTop: 0,
                  fontFamily: "'JetBrains Mono', monospace" }}>
        Top posts by PageRank · {data.results.length} nodes
      </p>
      {data.results.map((r: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 11, width: 24, textAlign: 'right', flexShrink: 0,
                         color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            #{i+1}
          </span>
          <div className="bar-track" style={{ width: 120, height: 6, flexShrink: 0 }}>
            <div className="bar-fill" style={{
              width: `${(r.pagerank / max) * 100}%`, height: '100%',
              background: `hsl(${270 - i * 20}, 90%, 65%)`,
            }}/>
          </div>
          <span style={{ fontSize: 11, width: 64, color: 'var(--purple)', flexShrink: 0,
                         fontFamily: "'JetBrains Mono', monospace" }}>
            {typeof r.pagerank === 'number' ? r.pagerank.toFixed(4) : r.pagerank}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.preview}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChainsView({ data }: any) {
  if (!Array.isArray(data) || !data.length)
    return <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>No chains found</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((c: any, i: number) => (
        <div key={i} style={{ padding: '12px 14px', borderRadius: 8,
                               background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 8,
                        fontFamily: "'JetBrains Mono', monospace" }}>
            depth: {c.depth}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {c.chain?.map((id: string, j: number) => (
              <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4,
                               background: 'rgba(96,165,250,0.12)', color: 'var(--blue)',
                               fontFamily: "'JetBrains Mono', monospace" }}>
                  {id?.slice(0,8)}
                </span>
                {j < c.chain.length - 1 && (
                  <span style={{ fontSize: 11, color: 'var(--faint)' }}>→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
