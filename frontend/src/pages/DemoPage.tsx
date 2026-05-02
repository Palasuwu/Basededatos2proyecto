import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  getUsers, listNodes, listRels,
  createBoard, createUser, createMod,
  setNodeProp, removeNodeProp, bulkSetNodeProp,
  createRel, setRelProp, removeRelProp,
  deleteRel, deleteNode,
} from '../api'

/* ── Types ──────────────────────────────────────── */
type StepStatus = 'idle' | 'running' | 'done' | 'error'

interface StepState {
  status: StepStatus
  result: any
}

/* ── IDs fetched from real DB ───────────────────── */
interface LiveCtx {
  userId: string
  userAlias: string
  boardId: string
  boardSlug: string
  relId: number
  demoBoardId: string | null
  demoUserId: string | null
  demoRelId: number | null
  createdPropKey: string | null
}

/* ── Step descriptor ────────────────────────────── */
interface Step {
  id: string
  phase: 'create' | 'props' | 'rels' | 'delete'
  rubric: string
  title: string
  desc: string
  cypher: string
  action: (ctx: LiveCtx) => Promise<any>
  updatesCtx?: (ctx: LiveCtx, result: any) => Partial<LiveCtx>
}

const PHASE_META = {
  create: { label: '① CREATE',      color: 'var(--green)',  bg: 'rgba(0,255,136,0.06)'  },
  props:  { label: '② PROPERTIES',  color: 'var(--blue)',   bg: 'rgba(96,165,250,0.06)' },
  rels:   { label: '③ RELATIONSHIPS',color: 'var(--purple)', bg: 'rgba(192,132,252,0.06)'},
  delete: { label: '④ DELETE',       color: 'var(--red)',    bg: 'rgba(248,113,113,0.06)'},
}

function buildSteps(): Step[] {
  return [
    // ── CREATE ──────────────────────────────────────────
    {
      id: 's1', phase: 'create',
      rubric: 'CREATE nodo — 1 label',
      title: 'CREATE Board (1 label)',
      desc: 'Crea un nodo Board con 1 label y 6 propiedades: id, name, slug, description, nsfw, post_count.',
      cypher: `CREATE (b:Board {
  id: randomUUID(), name: "Demo G8",
  slug: "demo-g8", description: "Demo board grupo 8",
  nsfw: false, post_count: 0, created_at: date()
}) RETURN b`,
      action: () => createBoard({ name: 'Demo G8', slug: 'demo-g8', description: 'Demo board grupo 8', nsfw: false }),
      updatesCtx: (ctx, r) => ({ demoBoardId: r.id }),
    },
    {
      id: 's2', phase: 'create',
      rubric: 'CREATE nodo — 1 label · 5+ propiedades',
      title: 'CREATE User (1 label, 5+ props)',
      desc: 'Crea un User con 10 propiedades: id, alias, is_anon, ip_hash, joined_at, post_count, karma, banned, interests[].',
      cypher: `CREATE (u:User {
  id: randomUUID(), alias: "user_demo_g8",
  is_anon: false, ip_hash: randomUUID(),
  joined_at: date(), post_count: 0,
  karma: 0, banned: false, interests: []
}) RETURN u`,
      action: () => createUser({ alias: 'user_demo_g8', is_anon: false }),
      updatesCtx: (ctx, r) => ({ demoUserId: r.id }),
    },
    {
      id: 's3', phase: 'create',
      rubric: 'MERGE nodo — 2 labels (User + Moderator)',
      title: 'MERGE Moderator (2 labels)',
      desc: 'Crea un nodo con 2 labels: User:Moderator. Usa MERGE para idempotencia.',
      cypher: `MERGE (m:User:Moderator {alias: "mod_demo_g8"})
ON CREATE SET
  m.id = randomUUID(), m.level = "junior",
  m.since = date(), m.active = true,
  m.active_boards = ["demo-g8"]
RETURN m`,
      action: () => createMod({ alias: 'mod_demo_g8', level: 'junior', active_boards: ['demo-g8'] }),
    },

    // ── PROPERTIES ──────────────────────────────────────
    {
      id: 's4', phase: 'props',
      rubric: 'Agregar propiedad en 1 nodo',
      title: 'SET property — 1 nodo (User real de la BD)',
      desc: 'Agrega la propiedad "badge" = "presenter" al usuario real cargado de la BD.',
      cypher: `MATCH (u:User {id: $userId})
SET u.badge = "presenter"
RETURN u`,
      action: (ctx) => setNodeProp('User', ctx.userId, { prop: 'badge', value: 'presenter' }),
      updatesCtx: (ctx) => ({ createdPropKey: 'badge' }),
    },
    {
      id: 's5', phase: 'props',
      rubric: 'Actualizar propiedad en múltiples nodos',
      title: 'BULK SET — múltiples nodos Post',
      desc: 'Actualiza la propiedad "flagged" = false en TODOS los Posts marcados como flagged.',
      cypher: `MATCH (p:Post)
WHERE p.flagged = true
SET p.flagged = false
RETURN count(p) AS updated`,
      action: () => bulkSetNodeProp('Post', { prop: 'flagged', value: false, filter_prop: 'flagged', filter_value: true }),
    },
    {
      id: 's6', phase: 'props',
      rubric: 'Eliminar propiedad en 1 nodo',
      title: 'REMOVE property — 1 nodo',
      desc: 'Elimina la propiedad "badge" que se agregó en el paso anterior.',
      cypher: `MATCH (u:User {id: $userId})
REMOVE u.badge
RETURN u`,
      action: (ctx) => removeNodeProp('User', ctx.userId, 'badge'),
    },

    // ── RELATIONSHIPS ────────────────────────────────────
    {
      id: 's7', phase: 'rels',
      rubric: 'CREATE relación con 3+ propiedades',
      title: 'CREATE relación FOLLOWS (3 props)',
      desc: 'Crea una relación FOLLOWS entre el usuario real y el board /tech/ con 3 propiedades.',
      cypher: `MATCH (u:User {id: $userId}), (b:Board {slug: "tech"})
CREATE (u)-[r:FOLLOWS {
  since: date(), notify: true, priority: 1
}]->(b)
RETURN id(r) AS rel_id, properties(r) AS props`,
      action: (ctx) => createRel({
        rel_type: 'FOLLOWS',
        from_label: 'User', from_id: ctx.userId,
        to_label: 'Board', to_id: 'tech',
        prop1_key: 'since', prop1_value: '2025-01-01',
        prop2_key: 'notify', prop2_value: 'true',
        prop3_key: 'priority', prop3_value: '1',
      }),
      updatesCtx: (ctx, r) => ({ demoRelId: r.rel_id }),
    },
    {
      id: 's8', phase: 'rels',
      rubric: 'Agregar/Actualizar propiedad en 1 relación',
      title: 'SET property — relación FOLLOWS',
      desc: 'Actualiza la propiedad "priority" = 9 en la relación FOLLOWS creada.',
      cypher: `MATCH ()-[r:FOLLOWS]->()
WHERE id(r) = $relId
SET r.priority = 9
RETURN id(r) AS rel_id, properties(r) AS props`,
      action: (ctx) => setRelProp('FOLLOWS', ctx.demoRelId!, { prop: 'priority', value: 9 }),
    },
    {
      id: 's9', phase: 'rels',
      rubric: 'Eliminar propiedad en 1 relación',
      title: 'REMOVE property — relación FOLLOWS',
      desc: 'Elimina la propiedad "notify" de la relación FOLLOWS.',
      cypher: `MATCH ()-[r:FOLLOWS]->()
WHERE id(r) = $relId
REMOVE r.notify
RETURN id(r) AS rel_id, properties(r) AS props`,
      action: (ctx) => removeRelProp('FOLLOWS', ctx.demoRelId!, 'notify'),
    },

    // ── DELETE ───────────────────────────────────────────
    {
      id: 's10', phase: 'delete',
      rubric: 'Eliminar 1 relación',
      title: 'DELETE — 1 relación FOLLOWS',
      desc: 'Elimina la relación FOLLOWS creada en el paso 7.',
      cypher: `MATCH ()-[r:FOLLOWS]->()
WHERE id(r) = $relId
DELETE r`,
      action: (ctx) => deleteRel('FOLLOWS', ctx.demoRelId!),
    },
    {
      id: 's11', phase: 'delete',
      rubric: 'Eliminar 1 nodo',
      title: 'DELETE — 1 nodo (Board demo)',
      desc: 'Elimina el Board demo-g8 creado en el paso 1 con DETACH DELETE.',
      cypher: `MATCH (b:Board {id: $demoBoardId})
DETACH DELETE b`,
      action: (ctx) => deleteNode('Board', ctx.demoBoardId!),
    },
    {
      id: 's12', phase: 'delete',
      rubric: 'Eliminar múltiples nodos',
      title: 'DELETE — múltiples nodos (User demo)',
      desc: 'Elimina el User demo_g8 y el Moderador demo creados en pasos 2 y 3.',
      cypher: `MATCH (u:User)
WHERE u.alias IN ["user_demo_g8", "mod_demo_g8"]
DETACH DELETE u`,
      action: (ctx) => deleteNode('User', ctx.demoUserId!),
    },
  ]
}

/* ── Components ─────────────────────────────────── */
function CypherBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden',
                   border: '1px solid var(--border)', marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 12px', background: 'rgba(0,0,0,0.3)',
                    borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace",
                       letterSpacing: '0.06em' }}>CYPHER</span>
        <button onClick={copy}
          style={{ fontSize: 10, color: copied ? 'var(--green)' : 'var(--muted)', background: 'none',
                   border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace' " }}>
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '12px 14px', fontSize: 11, color: 'var(--text)', lineHeight: 1.7,
                    fontFamily: "'JetBrains Mono', monospace", background: 'rgba(0,0,0,0.25)',
                    overflowX: 'auto' }}>
        {code}
      </pre>
    </div>
  )
}

function ResultBox({ result }: { result: any }) {
  return (
    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8,
                   background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)' }}>
      <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace",
                     display: 'block', marginBottom: 6 }}>RESULT</span>
      <pre style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace",
                    overflowX: 'auto', maxHeight: 160, lineHeight: 1.6 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────── */
export default function DemoPage() {
  const STEPS = buildSteps()
  const [ctx, setCtx]         = useState<LiveCtx>({
    userId: '', userAlias: '', boardId: '', boardSlug: 'tech',
    relId: 0, demoBoardId: null, demoUserId: null, demoRelId: null, createdPropKey: null,
  })
  const [steps, setSteps]     = useState<Record<string, StepState>>({})
  const [loadingCtx, setLoadingCtx] = useState(true)
  const [expanded, setExpanded] = useState<string | null>('s1')

  useEffect(() => {
    Promise.all([
      getUsers({ limit: 5 }),
      listRels('FOLLOWS', 1),
    ]).then(([users, rels]) => {
      const u = users.find((u: any) => !u.banned) || users[0]
      setCtx(c => ({
        ...c,
        userId: u?.id || '',
        userAlias: u?.alias || '',
        relId: rels[0]?.rel_id || 0,
      }))
    }).finally(() => setLoadingCtx(false))
  }, [])

  const runStep = async (step: Step) => {
    if (!ctx.userId && step.phase !== 'create') {
      toast.error('Carga el contexto primero')
      return
    }
    setSteps(s => ({ ...s, [step.id]: { status: 'running', result: null } }))
    try {
      const result = await step.action(ctx)
      if (step.updatesCtx) {
        const patch = step.updatesCtx(ctx, result)
        setCtx(c => ({ ...c, ...patch }))
      }
      setSteps(s => ({ ...s, [step.id]: { status: 'done', result } }))
      toast.success(`✓ ${step.title}`)
      // auto-expand next step
      const idx = STEPS.findIndex(s => s.id === step.id)
      if (idx < STEPS.length - 1) setExpanded(STEPS[idx + 1].id)
    } catch (e: any) {
      setSteps(s => ({ ...s, [step.id]: { status: 'error', result: e?.response?.data || e?.message } }))
      toast.error(`Error: ${e?.response?.data?.detail || e?.message}`)
    }
  }

  const completedCount = Object.values(steps).filter(s => s.status === 'done').length
  const progress = Math.round((completedCount / STEPS.length) * 100)

  const phases = ['create', 'props', 'rels', 'delete'] as const

  return (
    <div>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--yellow)' }}>▶</span>{' '}
              <span className="grad-green" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Demo Guiado</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              Flujo paso a paso para la presentación · {STEPS.length} pasos · {completedCount} completados
            </p>
          </div>

          {/* Progress */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: progress === 100 ? 'var(--green)' : 'var(--yellow)',
                           fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
              {progress}%
            </div>
            <div style={{ width: 120, height: 4, background: 'var(--faint)', borderRadius: 999, marginTop: 6 }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999,
                             background: progress === 100 ? 'var(--green)' : 'var(--yellow)',
                             transition: 'width 0.4s ease' }}/>
            </div>
          </div>
        </div>
      </div>

      {/* Live Context Panel */}
      <div className="glass-strong rounded-xl fade-up anim-delay-1" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span className="section-label">Contexto en vivo</span>
          {loadingCtx && <span style={{ fontSize: 11, color: 'var(--muted)' }}>cargando IDs reales...</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          {[
            { label: 'User ID (real BD)', val: ctx.userId, color: 'var(--green)'  },
            { label: 'User alias',        val: ctx.userAlias, color: 'var(--green)' },
            { label: 'Board slug',        val: ctx.boardSlug, color: 'var(--blue)'  },
            { label: 'Demo Board ID',     val: ctx.demoBoardId || '(paso 1)',        color: 'var(--muted)' },
            { label: 'Demo User ID',      val: ctx.demoUserId || '(paso 2)',         color: 'var(--muted)' },
            { label: 'Demo Rel ID',       val: ctx.demoRelId ?? '(paso 7)',          color: 'var(--purple)'},
          ].map(item => (
            <div key={item.label} style={{ padding: '8px 12px', borderRadius: 7,
                                            background: 'rgba(255,255,255,0.025)',
                                            border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: item.color, fontFamily: "'JetBrains Mono', monospace",
                             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {String(item.val)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Steps by phase */}
      {phases.map(phase => {
        const meta = PHASE_META[phase]
        const phaseSteps = STEPS.filter(s => s.phase === phase)
        const phaseDone  = phaseSteps.filter(s => steps[s.id]?.status === 'done').length
        return (
          <div key={phase} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: meta.color,
                             fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>
                {meta.label}
              </span>
              <div style={{ flex: 1, height: 1, background: `${meta.color}20` }}/>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {phaseDone}/{phaseSteps.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {phaseSteps.map((step, idx) => {
                const state  = steps[step.id]
                const isDone = state?.status === 'done'
                const isRunning = state?.status === 'running'
                const isOpen = expanded === step.id
                const num    = STEPS.findIndex(s => s.id === step.id) + 1

                return (
                  <div key={step.id} className="glass rounded-xl"
                    style={{ overflow: 'hidden', border: isDone ? `1px solid ${meta.color}30` : '1px solid var(--border)' }}>
                    {/* Step header — always visible */}
                    <div
                      onClick={() => setExpanded(isOpen ? null : step.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12,
                                padding: '14px 18px', cursor: 'pointer',
                                background: isDone ? `${meta.color}06` : 'transparent' }}>
                      {/* number badge */}
                      <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                                     fontSize: 12, fontWeight: 700,
                                     background: isDone ? meta.color : `${meta.color}12`,
                                     color: isDone ? '#050a08' : meta.color,
                                     border: `1px solid ${meta.color}30`,
                                     fontFamily: "'JetBrains Mono', monospace" }}>
                        {isDone ? '✓' : num}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? meta.color : 'var(--text)' }}>
                          {step.title}
                        </div>
                        <span className="tag-pill" style={{ background: `${meta.color}10`,
                          color: meta.color, border: `1px solid ${meta.color}20`,
                          fontSize: 10, marginTop: 3, display: 'inline-flex' }}>
                          {step.rubric}
                        </span>
                      </div>
                      {/* run button always visible */}
                      <button
                        onClick={e => { e.stopPropagation(); runStep(step) }}
                        disabled={isRunning}
                        style={{ padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                                  cursor: isRunning ? 'not-allowed' : 'pointer', flexShrink: 0,
                                  background: isDone ? `${meta.color}15` : `${meta.color}12`,
                                  color: meta.color, border: `1px solid ${meta.color}30`,
                                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isRunning ? (
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                                         border: `2px solid ${meta.color}44`, borderTopColor: meta.color,
                                         animation: 'spin 0.7s linear infinite' }}/>
                        ) : isDone ? '↻ Re-run' : '▶ Run'}
                      </button>
                      <span style={{ fontSize: 14, color: 'var(--faint)', marginLeft: 4,
                                     transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                        ›
                      </span>
                    </div>

                    {/* Expanded body */}
                    {isOpen && (
                      <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '14px 0 0', lineHeight: 1.6 }}>
                          {step.desc}
                        </p>
                        <CypherBlock code={step.cypher}/>
                        {state?.result && <ResultBox result={state.result}/>}
                        {state?.status === 'error' && (
                          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 7,
                                         background: 'rgba(248,113,113,0.07)',
                                         border: '1px solid rgba(248,113,113,0.2)',
                                         fontSize: 12, color: 'var(--red)' }}>
                            Error: {JSON.stringify(state.result)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
