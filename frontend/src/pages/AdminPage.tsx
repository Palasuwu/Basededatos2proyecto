import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  createBoard, createUser, createMod,
  listNodes, setNodeProp, removeNodeProp, bulkSetNodeProp, deleteNode, bulkDeleteNodes,
  listRels, createRel, setRelProp, removeRelProp, bulkSetRelProp, deleteRel, bulkDeleteRels,
  getUsers
} from '../api'

const LABELS   = ['Board','Thread','Post','User','Tag','File','Report','Ban','Reaction','IP']
const REL_TYPES = ['WROTE','FOLLOWS','HAS_THREAD','HAS_POST','QUOTES','TAGGED_WITH','MANAGES','BANS','TARGETS','REACTED_TO','POSTED_FROM']

/* ── Design tokens ────────────────────────────── */
const C = {
  bg:     'rgba(5,10,7,0.8)',
  border: 'rgba(0,255,136,0.1)',
  focus:  'rgba(0,255,136,0.35)',
}

/* ── Sub-components ───────────────────────────── */
function Panel({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)',
                       fontFamily: "'JetBrains Mono', monospace" }}>{title}</span>
        {badge && (
          <span className="tag-pill" style={{ background: 'rgba(0,255,136,0.08)',
            color: 'var(--green)', border: '1px solid rgba(0,255,136,0.15)', fontSize: 10 }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput(props: any) {
  return <input {...props} className="chan-input"/>
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select className="chan-input" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}

function PrimaryBtn({ children, onClick, disabled }: any) {
  return <button onClick={onClick} disabled={disabled} className="btn-primary">{children}</button>
}
function DangerBtn({ children, onClick }: any) {
  return <button onClick={onClick} className="btn-danger">{children}</button>
}
function GhostBtn({ children, onClick }: any) {
  return <button onClick={onClick} className="btn-ghost">{children}</button>
}

/* ── Result panel ─────────────────────────────── */
function ResultPanel({ result, onClose }: { result: any; onClose: () => void }) {
  return (
    <div className="glass-strong rounded-xl" style={{ padding: '16px 18px', marginTop: 16, animation: 'fadeUp 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="section-label">Last Result</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)',
                                           cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
      <pre style={{ fontSize: 11, color: 'var(--muted)', overflow: 'auto', maxHeight: 200, margin: 0,
                    fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}

/* ── Main component ───────────────────────────── */
export default function AdminPage() {
  const [tab, setTab] = useState<'create'|'props'|'rels'|'delete'>('create')
  const [nodes,  setNodes]  = useState<any[]>([])
  const [rels,   setRels]   = useState<any[]>([])
  const [users,  setUsers]  = useState<any[]>([])
  const [selLabel, setSelLabel] = useState('Post')
  const [selRel,   setSelRel]   = useState('WROTE')
  const [result,   setResult]   = useState<any>(null)

  useEffect(() => { getUsers({ limit: 30 }).then(setUsers) }, [])

  const loadNodes = (label: string) => listNodes(label, { limit: 30 }).then(n => { setNodes(n); setSelLabel(label) })
  const loadRels  = (type: string)  => listRels(type, 30).then(r => { setRels(r); setSelRel(type) })

  const [newBoard, setNewBoard] = useState({ name:'', slug:'', description:'', nsfw: false })
  const [newUser,  setNewUser]  = useState({ alias:'', is_anon: false })
  const [newMod,   setNewMod]   = useState({ alias:'', level:'junior', active_boards:'' })

  const [propOp, setPropOp] = useState({ label:'Post', node_id:'', prop:'', value:'' })
  const [bulkOp, setBulkOp] = useState({ label:'Post', prop:'', value:'', filter_prop:'', filter_value:'' })
  const [rmProp, setRmProp] = useState({ label:'Post', node_id:'', prop:'' })

  const [newRel, setNewRel] = useState({
    rel_type:'FOLLOWS', from_label:'User', from_id:'', to_label:'Board', to_id:'',
    prop1_key:'since', prop1_value:'2025-01-01',
    prop2_key:'notify', prop2_value:'true',
    prop3_key:'priority', prop3_value:'1',
  })
  const [relProp, setRelProp] = useState({ rel_type:'WROTE', rel_id:'', prop:'', value:'' })
  const [delRel,  setDelRel]  = useState({ rel_type:'WROTE', rel_id:'' })
  const [del1,    setDel1]    = useState({ label:'Post', node_id:'' })
  const [delM,    setDelM]    = useState({ label:'Post', filter_prop:'', filter_value:'' })
  const [bulkDelRelType, setBulkDelRelType] = useState('WROTE')
  const [bulkDelRelFP,   setBulkDelRelFP]   = useState('')
  const [bulkDelRelFV,   setBulkDelRelFV]   = useState('')

  const ok  = (msg: string, data: any) => { toast.success(msg); setResult(data) }
  const err = (e: any) => toast.error(e?.response?.data?.detail || 'Error')

  const TABS = [
    { key: 'create', label: '① Create Nodes',    color: 'var(--green)'  },
    { key: 'props',  label: '② Properties',       color: 'var(--blue)'   },
    { key: 'rels',   label: '③ Relationships',    color: 'var(--purple)' },
    { key: 'delete', label: '④ Delete',           color: 'var(--red)'    },
  ] as const

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>
          <span className="grad-green" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Admin Panel</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          CRUD operations · Neo4j node &amp; relationship management
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              background: tab === t.key ? `${t.color}12` : 'rgba(255,255,255,0.03)',
              color: tab === t.key ? t.color : 'var(--muted)',
              border: `1px solid ${tab === t.key ? `${t.color}30` : 'var(--border)'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CREATE ────────────────────────────── */}
      {tab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <Panel title="CREATE — 1 Label (Board)" badge="CREATE">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Name">
                <TextInput value={newBoard.name} onChange={(e:any) => setNewBoard({...newBoard, name: e.target.value})}/>
              </Field>
              <Field label="Slug (e.g. sci2)">
                <TextInput value={newBoard.slug} onChange={(e:any) => setNewBoard({...newBoard, slug: e.target.value})}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}/>
              </Field>
              <Field label="Description">
                <TextInput value={newBoard.description} onChange={(e:any) => setNewBoard({...newBoard, description: e.target.value})}/>
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--muted)' }}>
                <input type="checkbox" checked={newBoard.nsfw} onChange={e => setNewBoard({...newBoard, nsfw: e.target.checked})}
                  style={{ accentColor: 'var(--green)' }}/>
                NSFW
              </label>
              <PrimaryBtn onClick={() => createBoard(newBoard).then(d => ok('Board created!', d)).catch(err)}>
                Create Board
              </PrimaryBtn>
            </div>
          </Panel>

          <Panel title="CREATE — 1 Label (User)" badge="5+ props">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Alias">
                <TextInput value={newUser.alias} onChange={(e:any) => setNewUser({...newUser, alias: e.target.value})}/>
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--muted)' }}>
                <input type="checkbox" checked={newUser.is_anon} onChange={e => setNewUser({...newUser, is_anon: e.target.checked})}
                  style={{ accentColor: 'var(--green)' }}/>
                Anonymous
              </label>
              <PrimaryBtn onClick={() => createUser(newUser).then(d => ok('User created!', d)).catch(err)}>
                Create User
              </PrimaryBtn>
            </div>
          </Panel>

          <Panel title="CREATE — 2 Labels (User + Moderator)" badge="MERGE">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Alias">
                <TextInput value={newMod.alias} onChange={(e:any) => setNewMod({...newMod, alias: e.target.value})}/>
              </Field>
              <Field label="Level">
                <Select value={newMod.level} onChange={v => setNewMod({...newMod, level: v})}
                  options={['junior','senior','head']}/>
              </Field>
              <Field label="Active boards (comma sep)">
                <TextInput value={newMod.active_boards} onChange={(e:any) => setNewMod({...newMod, active_boards: e.target.value})}/>
              </Field>
              <PrimaryBtn onClick={() => {
                const d = { ...newMod, active_boards: newMod.active_boards.split(',').map(s=>s.trim()).filter(Boolean) }
                createMod(d).then(r => ok('Moderator created! (User:Moderator)', r)).catch(err)
              }}>
                Create Moderator
              </PrimaryBtn>
            </div>
          </Panel>
        </div>
      )}

      {/* ── PROPERTIES ───────────────────────── */}
      {tab === 'props' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <Panel title="SET Property — 1 Node" badge="UPDATE 1">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Label"><Select value={propOp.label} onChange={v => setPropOp({...propOp, label: v})} options={LABELS}/></Field>
                <Field label="Node ID"><TextInput value={propOp.node_id} onChange={(e:any) => setPropOp({...propOp, node_id: e.target.value})} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}/></Field>
                <Field label="Property name"><TextInput value={propOp.prop} onChange={(e:any) => setPropOp({...propOp, prop: e.target.value})}/></Field>
                <Field label="Value"><TextInput value={propOp.value} onChange={(e:any) => setPropOp({...propOp, value: e.target.value})}/></Field>
                <PrimaryBtn onClick={() => setNodeProp(propOp.label, propOp.node_id, { prop: propOp.prop, value: propOp.value }).then(d => ok('Property set!', d)).catch(err)}>
                  Set Property
                </PrimaryBtn>
              </div>
            </Panel>

            <Panel title="BULK SET Property — Multiple Nodes" badge="UPDATE MANY">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Label"><Select value={bulkOp.label} onChange={v => setBulkOp({...bulkOp, label: v})} options={LABELS}/></Field>
                <Field label="Property name"><TextInput value={bulkOp.prop} onChange={(e:any) => setBulkOp({...bulkOp, prop: e.target.value})}/></Field>
                <Field label="New value"><TextInput value={bulkOp.value} onChange={(e:any) => setBulkOp({...bulkOp, value: e.target.value})}/></Field>
                <Field label="Filter prop (optional)"><TextInput value={bulkOp.filter_prop} onChange={(e:any) => setBulkOp({...bulkOp, filter_prop: e.target.value})}/></Field>
                <Field label="Filter value"><TextInput value={bulkOp.filter_value} onChange={(e:any) => setBulkOp({...bulkOp, filter_value: e.target.value})}/></Field>
                <PrimaryBtn onClick={() => bulkSetNodeProp(bulkOp.label, { prop: bulkOp.prop, value: bulkOp.value, filter_prop: bulkOp.filter_prop || null, filter_value: bulkOp.filter_value || null }).then(d => ok(`Updated ${d.updated} nodes`, d)).catch(err)}>
                  Bulk Update
                </PrimaryBtn>
              </div>
            </Panel>

            <Panel title="REMOVE Property — 1 Node" badge="DELETE PROP">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Label"><Select value={rmProp.label} onChange={v => setRmProp({...rmProp, label: v})} options={LABELS}/></Field>
                <Field label="Node ID"><TextInput value={rmProp.node_id} onChange={(e:any) => setRmProp({...rmProp, node_id: e.target.value})} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}/></Field>
                <Field label="Property name"><TextInput value={rmProp.prop} onChange={(e:any) => setRmProp({...rmProp, prop: e.target.value})}/></Field>
                <DangerBtn onClick={() => removeNodeProp(rmProp.label, rmProp.node_id, rmProp.prop).then(d => ok('Property removed!', d)).catch(err)}>
                  Remove Property
                </DangerBtn>
              </div>
            </Panel>
          </div>

          {/* Browse nodes */}
          <Panel title="Browse Nodes" badge="READ + FILTER">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {LABELS.map(l => (
                <button key={l} onClick={() => loadNodes(l)}
                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                           cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'JetBrains Mono', monospace",
                           background: selLabel === l ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.03)',
                           color: selLabel === l ? 'var(--green)' : 'var(--muted)',
                           border: `1px solid ${selLabel === l ? 'rgba(0,255,136,0.25)' : 'var(--border)'}` }}>
                  {l}
                </button>
              ))}
            </div>
            {nodes.length > 0 && (
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)', maxHeight: 300, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)' }}>
                    <tr>
                      {Object.keys(nodes[0]).slice(0, 6).map(k => <th key={k}>{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((n: any, i: number) => (
                      <tr key={i}>
                        {Object.values(n).slice(0, 6).map((v: any, j: number) => (
                          <td key={j} style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {Array.isArray(v) ? v.join(', ') : String(v ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ── RELATIONSHIPS ─────────────────────── */}
      {tab === 'rels' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            <Panel title="CREATE Relationship — 3 Properties" badge="CREATE REL">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Type"><Select value={newRel.rel_type} onChange={v => setNewRel({...newRel, rel_type: v})} options={REL_TYPES}/></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Field label="From Label"><TextInput value={newRel.from_label} onChange={(e:any) => setNewRel({...newRel, from_label: e.target.value})}/></Field>
                  <Field label="From ID"><TextInput value={newRel.from_id} onChange={(e:any) => setNewRel({...newRel, from_id: e.target.value})} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}/></Field>
                  <Field label="To Label"><TextInput value={newRel.to_label} onChange={(e:any) => setNewRel({...newRel, to_label: e.target.value})}/></Field>
                  <Field label="To ID"><TextInput value={newRel.to_id} onChange={(e:any) => setNewRel({...newRel, to_id: e.target.value})} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}/></Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['1','2','3'] as const).map(n => (
                    <>
                      <Field key={`k${n}`} label={`Prop ${n} key`}>
                        <TextInput value={(newRel as any)[`prop${n}_key`]}
                          onChange={(e:any) => setNewRel({...newRel, [`prop${n}_key`]: e.target.value})}/>
                      </Field>
                      <Field key={`v${n}`} label={`Prop ${n} value`}>
                        <TextInput value={(newRel as any)[`prop${n}_value`]}
                          onChange={(e:any) => setNewRel({...newRel, [`prop${n}_value`]: e.target.value})}/>
                      </Field>
                    </>
                  ))}
                </div>
                <PrimaryBtn onClick={() => createRel(newRel).then(d => ok('Relationship created!', d)).catch(err)}>
                  Create Relationship
                </PrimaryBtn>
              </div>
            </Panel>

            <Panel title="SET / REMOVE Rel Property" badge="MANAGE PROPS">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Type"><Select value={relProp.rel_type} onChange={v => setRelProp({...relProp, rel_type: v})} options={REL_TYPES}/></Field>
                <Field label="Relationship ID (internal neo4j id)">
                  <TextInput value={relProp.rel_id} onChange={(e:any) => setRelProp({...relProp, rel_id: e.target.value})}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}/>
                </Field>
                <Field label="Property name"><TextInput value={relProp.prop} onChange={(e:any) => setRelProp({...relProp, prop: e.target.value})}/></Field>
                <Field label="Value"><TextInput value={relProp.value} onChange={(e:any) => setRelProp({...relProp, value: e.target.value})}/></Field>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PrimaryBtn onClick={() => setRelProp_(relProp.rel_type, parseInt(relProp.rel_id), { prop: relProp.prop, value: relProp.value }).then(d => ok('Prop set!', d)).catch(err)}>
                    Set Prop
                  </PrimaryBtn>
                  <DangerBtn onClick={() => removeRelProp(relProp.rel_type, parseInt(relProp.rel_id), relProp.prop).then(d => ok('Prop removed!', d)).catch(err)}>
                    Remove Prop
                  </DangerBtn>
                </div>
              </div>
            </Panel>
          </div>

          {/* Browse rels */}
          <Panel title="Browse Relationships" badge="READ">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {REL_TYPES.map(r => (
                <button key={r} onClick={() => loadRels(r)}
                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                           cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'JetBrains Mono', monospace",
                           background: selRel === r ? 'rgba(192,132,252,0.1)' : 'rgba(255,255,255,0.03)',
                           color: selRel === r ? 'var(--purple)' : 'var(--muted)',
                           border: `1px solid ${selRel === r ? 'rgba(192,132,252,0.25)' : 'var(--border)'}` }}>
                  {r}
                </button>
              ))}
            </div>
            {rels.length > 0 && (
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)', maxHeight: 280, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)' }}>
                    <tr>
                      {['rel_id','from_label','from_id','to_label','to_id','props'].map(k => <th key={k}>{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rels.map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--yellow)' }}>{r.rel_id}</td>
                        <td style={{ color: 'var(--blue)' }}>{r.from_label}</td>
                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.from_id}</td>
                        <td style={{ color: 'var(--blue)' }}>{r.to_label}</td>
                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.to_id}</td>
                        <td style={{ color: 'var(--faint)' }}>{JSON.stringify(r.props).slice(0,60)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ── DELETE ────────────────────────────── */}
      {tab === 'delete' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <Panel title="DELETE — 1 Node" badge="DELETE">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Label"><Select value={del1.label} onChange={v => setDel1({...del1, label: v})} options={LABELS}/></Field>
              <Field label="Node ID">
                <TextInput value={del1.node_id} onChange={(e:any) => setDel1({...del1, node_id: e.target.value})}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}/>
              </Field>
              <DangerBtn onClick={() => { if (!confirm('Delete this node and all its relationships?')) return; deleteNode(del1.label, del1.node_id).then(d => ok('Node deleted', d)).catch(err) }}>
                Delete Node
              </DangerBtn>
            </div>
          </Panel>

          <Panel title="DELETE — Multiple Nodes" badge="BULK DELETE">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Label"><Select value={delM.label} onChange={v => setDelM({...delM, label: v})} options={LABELS}/></Field>
              <Field label="Filter prop (optional)"><TextInput value={delM.filter_prop} onChange={(e:any) => setDelM({...delM, filter_prop: e.target.value})}/></Field>
              <Field label="Filter value"><TextInput value={delM.filter_value} onChange={(e:any) => setDelM({...delM, filter_value: e.target.value})}/></Field>
              <p style={{ fontSize: 11, color: 'rgba(248,113,113,0.5)', margin: '2px 0' }}>
                Without filter, deletes ALL nodes of this label.
              </p>
              <DangerBtn onClick={() => { if (!confirm('Delete multiple nodes? This cannot be undone.')) return; bulkDeleteNodes(delM.label, { filter_prop: delM.filter_prop || undefined, filter_value: delM.filter_value || undefined }).then(d => ok(`Deleted ${d.deleted} nodes`, d)).catch(err) }}>
                Delete Multiple Nodes
              </DangerBtn>
            </div>
          </Panel>

          <Panel title="DELETE — 1 Relationship" badge="DELETE REL">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Type"><Select value={delRel.rel_type} onChange={v => setDelRel({...delRel, rel_type: v})} options={REL_TYPES}/></Field>
              <Field label="Relationship ID (from Browse table)">
                <TextInput value={delRel.rel_id} onChange={(e:any) => setDelRel({...delRel, rel_id: e.target.value})}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}/>
              </Field>
              <DangerBtn onClick={() => { if (!confirm('Delete this relationship?')) return; deleteRel(delRel.rel_type, parseInt(delRel.rel_id)).then(d => ok('Deleted', d)).catch(err) }}>
                Delete Relationship
              </DangerBtn>
            </div>
          </Panel>

          <Panel title="DELETE — Multiple Relationships" badge="BULK DELETE REL">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Type"><Select value={bulkDelRelType} onChange={setBulkDelRelType} options={REL_TYPES}/></Field>
              <Field label="Filter prop (optional)"><TextInput value={bulkDelRelFP} onChange={(e:any) => setBulkDelRelFP(e.target.value)}/></Field>
              <Field label="Filter value"><TextInput value={bulkDelRelFV} onChange={(e:any) => setBulkDelRelFV(e.target.value)}/></Field>
              <DangerBtn onClick={() => { if (!confirm('Delete multiple relationships?')) return; bulkDeleteRels(bulkDelRelType, { filter_prop: bulkDelRelFP||undefined, filter_value: bulkDelRelFV||undefined }).then(d => ok(`Deleted ${d.deleted} relationships`, d)).catch(err) }}>
                Delete Multiple Rels
              </DangerBtn>
            </div>
          </Panel>
        </div>
      )}

      {result && <ResultPanel result={result} onClose={() => setResult(null)}/>}
    </div>
  )
}

const setRelProp_ = setRelProp
