import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStats, getCountryPosts, getCountryInfluence } from '../api'
import * as am5 from '@amcharts/amcharts5'
import * as am5map from '@amcharts/amcharts5/map'
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow'
// ── Types ─────────────────────────────────────────────────────────────────
interface CountryDatum {
  country: string   // ISO 2-letter
  value:   number
  label:   string   // tooltip text
}

// Interpola hex de oscuro (0x0d2a1a) a verde (0x00ff88) según t ∈ [0,1]
function lerpGreen(t: number): am5.Color {
  const r = Math.round(0x0d + (0x00 - 0x0d) * t)
  const g = Math.round(0x2a + (0xff - 0x2a) * t)
  const b = Math.round(0x1a + (0x88 - 0x1a) * t)
  return am5.color((r << 16) | (g << 8) | b)
}

// ── Animated counter ──────────────────────────────────────────────────────
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

// ── Globe coroplético ─────────────────────────────────────────────────────
interface GlobeProps { countryData: CountryDatum[] }

function Globe({ countryData }: GlobeProps) {
  const animRef        = useRef<{ stop(): void } | undefined>(undefined)
  const seriesRef      = useRef<am5map.MapPolygonSeries | null>(null)
  const chartRef       = useRef<am5map.MapChart | null>(null)
  const countryDataRef = useRef<CountryDatum[]>([])
  const [sliderX, setSliderX] = useState(0)

  // Pinta fills directamente en cada polígono (sin adapters, sin problemas de timing)
  const paintPolygons = (series: am5map.MapPolygonSeries, data: CountryDatum[]) => {
    if (data.length === 0) return
    const maxVal = Math.max(...data.map(d => d.value), 1)
    const lookup = new Map(data.map(d => [d.country, d]))
    series.mapPolygons.each(polygon => {
      const id    = (polygon.dataItem as any)?.dataContext?.id as string | undefined
      const datum = id ? lookup.get(id) : undefined
      if (datum) {
        polygon.set('fill',        lerpGreen(datum.value / maxVal))
        polygon.set('tooltipText', `{name}\n${datum.label}`)
      }
    })
  }

  // Init globe once — sin tema Animated para evitar paleta azul
  useEffect(() => {
    const root = am5.Root.new('globe-div')

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        panX:          'rotateX',
        panY:          'rotateY',
        wheelY:        'zoom',
        projection:    am5map.geoOrthographic(),
        paddingBottom: 0, paddingTop: 0, paddingLeft: 0, paddingRight: 0,
      })
    )
    chartRef.current = chart

    // Sphere background
    const bgSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {}))
    bgSeries.mapPolygons.template.setAll({ fill: am5.color(0x071510), strokeOpacity: 0 })
    bgSeries.data.push({
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-179.999, -89.999], [179.999, -89.999],
          [179.999,  89.999],  [-179.999,  89.999],
          [-179.999, -89.999],
        ]],
      },
    })

    // Grid
    const graticule = chart.series.push(am5map.GraticuleSeries.new(root, { step: 10 }))
    graticule.mapLines.template.setAll({
      stroke: am5.color(0x00ff88), strokeOpacity: 0.08, strokeWidth: 0.5,
    })

    // Países — fill oscuro base, sin adapter (pintamos directamente)
    const countries = chart.series.push(
      am5map.MapPolygonSeries.new(root, { geoJSON: am5geodata_worldLow, exclude: ['AQ'] })
    )
    seriesRef.current = countries

    countries.mapPolygons.template.setAll({
      fill:          am5.color(0x0d2a1a),
      stroke:        am5.color(0x00ff88),
      strokeWidth:   0.4,
      strokeOpacity: 0.22,
      tooltipText:   '{name}',
      interactive:   true,
      toggleKey:     'active',
    })

    countries.mapPolygons.template.states.create('hover',  { fillOpacity: 0.85 })
    countries.mapPolygons.template.states.create('active', { fillOpacity: 1.0  })

    // Deselect anterior al clicar otro
    let prev: am5map.MapPolygon | undefined
    countries.mapPolygons.template.on('active', (active, target) => {
      if (prev && prev !== target) prev.set('active', false)
      if (active) prev = target as am5map.MapPolygon
    })

    // Una vez que el GeoJSON está procesado, aplicar colores si ya hay datos
    countries.events.on('datavalidated', () => {
      paintPolygons(countries, countryDataRef.current)
    })

    // Auto-rotación
    const startRotation = () => {
      const from = chart.get('rotationX') ?? 0
      animRef.current = chart.animate({
        key: 'rotationX', from, to: from - 360, duration: 30000, loops: Infinity,
      })
    }
    startRotation()
    chart.events.on('pointerdown', () => animRef.current?.stop())
    chart.events.on('pointerup',   () => startRotation())

    // Fade-in manual
    chart.set('opacity', 0)
    chart.animate({ key: 'opacity', to: 1, duration: 1000 })

    return () => root.dispose()
  }, [])

  // Actualiza colores del coroplético cuando cambian los datos
  useEffect(() => {
    countryDataRef.current = countryData
    if (seriesRef.current) paintPolygons(seriesRef.current, countryData)
  }, [countryData])

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setSliderX(val)
    animRef.current?.stop()
    chartRef.current?.set('rotationX', val)
  }
  const handleSliderUp = () => {
    const c = chartRef.current; if (!c) return
    const from = c.get('rotationX') ?? 0
    animRef.current = c.animate({
      key: 'rotationX', from, to: from - 360, duration: 30000, loops: Infinity,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div id="globe-div" style={{ flex: 1, minHeight: 0 }} />

      {/* Slider */}
      <div style={{ padding: '10px 20px 2px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: "'JetBrains Mono', monospace",
                       letterSpacing: '0.08em' }}>rotación</span>
        <input type="range" min={-180} max={180} value={sliderX}
          onChange={handleSlider} onMouseUp={handleSliderUp} onTouchEnd={handleSliderUp}
          style={{
            flex: 1, appearance: 'none', WebkitAppearance: 'none',
            height: 3, borderRadius: 2, outline: 'none', cursor: 'pointer',
            background: `linear-gradient(to right,
              rgba(0,255,136,0.7) ${((sliderX+180)/360*100)}%,
              rgba(0,255,136,0.12) ${((sliderX+180)/360*100)}%)`,
          }} />
        <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: "'JetBrains Mono', monospace",
                       minWidth: 32, textAlign: 'right' }}>{sliderX}°</span>
      </div>

      {/* Color legend */}
      {countryData.length > 0 && (
        <div style={{ padding: '6px 20px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--faint)' }}>Menos</span>
          <div style={{ flex: 1, height: 4, borderRadius: 2,
                        background: 'linear-gradient(to right, #0d2a1a, #00ff88)' }} />
          <span style={{ fontSize: 10, color: 'var(--faint)' }}>Más</span>
        </div>
      )}
    </div>
  )
}

// ── Page data ─────────────────────────────────────────────────────────────
const FEATURES = [
  { to: '/boards',    icon: '◈', color: 'var(--green)',  title: 'Board Index',  badge: 'Explore',      desc: 'Browse 10 boards temáticos con miles de threads y posts. Filtra, explora y participa.' },
  { to: '/admin',     icon: '⚙', color: 'var(--blue)',   title: 'Admin Panel',  badge: 'CRUD',         desc: 'CRUD completo: nodos, propiedades y relaciones. Todas las operaciones de la rúbrica.' },
  { to: '/analytics', icon: '◉', color: 'var(--purple)', title: 'Analytics',    badge: 'Queries',      desc: '9 consultas Cypher en vivo con PageRank GDS. Detección de fraude, influencia y más.' },
  { to: '/demo',      icon: '▶', color: 'var(--yellow)', title: 'Demo Guiado',  badge: 'Presentación', desc: 'Flujo paso a paso para la presentación. IDs reales pre-cargados, resultados en vivo.' },
]

const TEAM = [
  { name: 'Adrián González', id: '23152',  queries: 'Q1: Suspicious IPs · Q2: Board Stats',  color: 'var(--green)'  },
  { name: 'Jorge Palacios',  id: '231385', queries: 'Q3: Active Threads · Q4: Quote Chains', color: 'var(--blue)'   },
  { name: 'Wilson Calderón', id: '22018',  queries: 'Q5: Influential Users · Q6 · Q7',       color: 'var(--purple)' },
]

const STACK = [
  { name: 'Neo4j 2026', color: '#00ff88', sub: 'Enterprise · Graph DB' },
  { name: 'FastAPI',    color: '#60a5fa', sub: 'Python · REST API'      },
  { name: 'React 18',   color: '#c084fc', sub: 'TypeScript · Vite'      },
  { name: 'GDS Plugin', color: '#fbbf24', sub: 'PageRank · Betweenness' },
]

// ── Landing page ──────────────────────────────────────────────────────────
export default function Landing() {
  const [stats, setStats]           = useState<any>(null)
  const [mode, setMode]             = useState<'posts' | 'gds'>('posts')
  const [countryData, setCountryData] = useState<CountryDatum[]>([])
  const [gdsAvailable, setGdsAvailable] = useState(true)
  const [gdsLoading, setGdsLoading]   = useState(false)

  useEffect(() => { getStats().then(setStats).catch(() => {}) }, [])

  // Fetch choropleth data based on mode
  useEffect(() => {
    if (mode === 'posts') {
      getCountryPosts()
        .then((rows: any[]) =>
          setCountryData(rows.map(r => ({
            country: r.country,
            value:   r.posts,
            label:   `${Number(r.posts).toLocaleString()} posts · riesgo ${r.avg_risk}%`,
          })))
        )
        .catch(() => {})
    } else {
      setGdsLoading(true)
      getCountryInfluence()
        .then((res: any) => {
          if (res.status === 'gds_not_installed') {
            setGdsAvailable(false)
            setMode('posts')
          } else {
            setCountryData(res.results.map((r: any) => ({
              country: r.country,
              value:   r.influence,
              label:   `influencia ${r.influence} · ${Number(r.posts).toLocaleString()} posts`,
            })))
          }
        })
        .catch(() => { setGdsAvailable(false); setMode('posts') })
        .finally(() => setGdsLoading(false))
    }
  }, [mode])

  return (
    <div>
      {/* ── Hero: text left · globe right ────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 0, minHeight: 540, marginBottom: 40, alignItems: 'stretch',
      }}>

        {/* Left — text */}
        <div className="fade-up" style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          paddingRight: 48, paddingTop: 24, paddingBottom: 24,
        }}>
          <span style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 999, marginBottom: 22,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            background: 'rgba(0,255,136,0.08)', color: 'var(--green)',
            border: '1px solid rgba(0,255,136,0.2)', fontFamily: "'JetBrains Mono', monospace",
            alignSelf: 'flex-start',
          }}>
            CC3089 Base de Datos 2 · UVG · Grupo 8
          </span>

          <h1 style={{ fontSize: 'clamp(42px, 6vw, 72px)', fontWeight: 800,
                       lineHeight: 1.05, margin: '0 0 18px', letterSpacing: '-0.03em' }}>
            <span className="grad-title" style={{ fontFamily: "'JetBrains Mono', monospace", display: 'block' }}>
              /chan/db
            </span>
            <span style={{ color: 'var(--text)', fontSize: '0.42em', fontWeight: 400,
                           fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
                           display: 'block', marginTop: 10 }}>
              Plataforma de foros sobre grafo Neo4j
            </span>
          </h1>

          <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 420, margin: '0 0 32px', lineHeight: 1.65 }}>
            7,775 nodos · 19,634 relaciones · 11 labels · 15 tipos de relación.
            CRUD completo, Cypher avanzado y PageRank.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/boards" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ fontSize: 14, padding: '11px 28px' }}>
                Explorar Boards →
              </button>
            </Link>
            <Link to="/demo" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost" style={{
                fontSize: 14, padding: '11px 28px',
                border: '1px solid rgba(251,191,36,0.3)', color: 'var(--yellow)',
              }}>
                ▶ Demo Guiado
              </button>
            </Link>
          </div>

          {stats && (
            <div style={{ display: 'flex', gap: 24, marginTop: 36, flexWrap: 'wrap' }}>
              {[
                { label: 'nodos',      val: stats.total_nodes,         color: 'var(--green)' },
                { label: 'relaciones', val: stats.total_rels,          color: 'var(--blue)'  },
                { label: 'aislados',   val: stats.isolated_nodes ?? 0, color: 'var(--green)' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1,
                                fontFamily: "'JetBrains Mono', monospace" }}>
                    <AnimatedNumber target={s.val ?? 0} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 3,
                                textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — globe */}
        <div style={{
          position: 'relative', borderRadius: 20, overflow: 'hidden',
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,40,20,0.5) 0%, rgba(5,10,8,0) 70%)',
          border: '1px solid rgba(0,255,136,0.08)',
        }}>
          {/* Mode toggle */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10,
                        display: 'flex', gap: 4 }}>
            <button
              onClick={() => setMode('posts')}
              style={{
                fontSize: 10, padding: '4px 10px', borderRadius: 6, border: 'none',
                cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600, letterSpacing: '0.06em',
                background: mode === 'posts' ? 'rgba(0,255,136,0.2)'  : 'rgba(255,255,255,0.04)',
                color:      mode === 'posts' ? 'var(--green)' : 'var(--muted)',
                boxShadow:  mode === 'posts' ? '0 0 0 1px rgba(0,255,136,0.3)' : '0 0 0 1px rgba(255,255,255,0.07)',
              }}>
              Posts
            </button>
            <button
              onClick={() => gdsAvailable && setMode('gds')}
              title={!gdsAvailable ? 'Instala el plugin GDS en Neo4j Desktop' : undefined}
              style={{
                fontSize: 10, padding: '4px 10px', borderRadius: 6, border: 'none',
                cursor: gdsAvailable ? 'pointer' : 'not-allowed',
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: '0.06em',
                background: mode === 'gds' ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.04)',
                color:      mode === 'gds' ? 'var(--yellow)' : (gdsAvailable ? 'var(--muted)' : 'var(--faint)'),
                boxShadow:  mode === 'gds' ? '0 0 0 1px rgba(251,191,36,0.3)' : '0 0 0 1px rgba(255,255,255,0.07)',
                opacity:    !gdsAvailable ? 0.5 : 1,
              }}>
              {gdsLoading ? '...' : 'GDS PageRank'}
            </button>
          </div>

          {/* Mode label */}
          <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10 }}>
            <span style={{
              fontSize: 9, color: 'var(--faint)', fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {mode === 'posts' ? 'posts por país' : 'influencia gds'}
            </span>
          </div>

          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,255,136,0.04) 0%, transparent 70%)',
          }} />

          <Globe countryData={countryData} />
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span className="section-label">Secciones</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
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
                                background: `${f.color}12`, color: f.color, border: `1px solid ${f.color}22` }}>
                    {f.icon}
                  </div>
                  <span className="tag-pill" style={{ background: `${f.color}10`,
                    color: f.color, border: `1px solid ${f.color}25`, fontSize: 10 }}>
                    {f.badge}
                  </span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Team + Stack ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <div className="glass rounded-xl" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span className="section-label">Equipo</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TEAM.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', flexShrink: 0,
                              alignItems: 'center', justifyContent: 'center',
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
                              boxShadow: `0 0 6px ${s.color}`, flexShrink: 0 }} />
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
