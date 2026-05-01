import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getBoard, getThreads, createThread, getUsers, deleteThread } from '../api'

export default function BoardPage() {
  const { slug } = useParams<{ slug: string }>()
  const [board,    setBoard]    = useState<any>(null)
  const [threads,  setThreads]  = useState<any[]>([])
  const [users,    setUsers]    = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ title: '', user_id: '', tags: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    getBoard(slug!).then(setBoard)
    getThreads({ board_slug: slug, limit: 50 }).then(setThreads)
    getUsers({ limit: 20 }).then(setUsers)
  }
  useEffect(load, [slug])

  const submit = async (e: any) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createThread({ ...form, board_slug: slug, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })
      toast.success('Thread created')
      setShowForm(false)
      setForm({ title: '', user_id: '', tags: '' })
      load()
    } catch { toast.error('Error creating thread') }
    setSubmitting(false)
  }

  const del = async (id: string) => {
    if (!confirm('Delete thread and all its posts?')) return
    await deleteThread(id)
    toast.success('Deleted')
    load()
  }

  return (
    <div>
      {board && (
        <div className="fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Link to="/" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>Boards</Link>
              <span style={{ color: 'var(--faint)' }}>›</span>
              <h1 style={{ fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                           margin: 0 }}>
                <span className="grad-green">/{board.slug}/</span>
              </h1>
              {board.nsfw && (
                <span className="tag-pill" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--red)',
                                                     border: '1px solid rgba(248,113,113,0.25)' }}>NSFW</span>
              )}
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>{board.description}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ marginTop: 4, flexShrink: 0 }}>
            + New Thread
          </button>
        </div>
      )}

      {showForm && (
        <div className="glass-strong rounded-xl p-6 fade-up" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginBottom: 16, marginTop: 0 }}>
            New Thread
          </h3>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5, fontWeight: 500 }}>
                Title *
              </label>
              <input required className="chan-input" placeholder="Thread title..."
                value={form.title} onChange={e => setForm({...form, title: e.target.value})}/>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5, fontWeight: 500 }}>
                Posted as *
              </label>
              <select required className="chan-input" value={form.user_id}
                onChange={e => setForm({...form, user_id: e.target.value})}>
                <option value="">Select user</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.alias}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5, fontWeight: 500 }}>
                Tags (comma separated)
              </label>
              <input className="chan-input" placeholder="e.g. neo4j, databases, graphs"
                value={form.tags} onChange={e => setForm({...form, tags: e.target.value})}/>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Posting...' : 'Create Thread'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {threads.map(({ thread }: any, i: number) => (
          <div key={thread.id} className="glass glow-hover rounded-xl fade-up"
            style={{ opacity: 0, animationDelay: `${i * 25}ms`, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to={`/thread/${thread.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {thread.is_pinned && (
                    <span className="tag-pill" style={{ background: 'rgba(251,191,36,0.1)',
                      color: 'var(--yellow)', border: '1px solid rgba(251,191,36,0.25)' }}>PINNED</span>
                  )}
                  {thread.locked && (
                    <span className="tag-pill" style={{ background: 'rgba(248,113,113,0.1)',
                      color: 'var(--red)', border: '1px solid rgba(248,113,113,0.25)' }}>LOCKED</span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{thread.title}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)',
                              fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: 'var(--green)', opacity: 0.8 }}>{thread.reply_count} replies</span>
                  {thread.tags?.slice(0,3).map((t: string) => (
                    <span key={t} style={{ color: 'var(--faint)' }}>#{t}</span>
                  ))}
                </div>
              </Link>
              <button onClick={() => del(thread.id)} className="btn-danger" style={{ flexShrink: 0, padding: '5px 10px', fontSize: 11 }}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {threads.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--faint)' }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>◈</div>
            <p style={{ fontSize: 14 }}>No threads yet. Be the first to post.</p>
          </div>
        )}
      </div>
    </div>
  )
}
