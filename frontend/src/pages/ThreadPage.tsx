import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getThread, getPosts, createPost, softDelete, scorePost, getUsers } from '../api'

function PostCard({ post, author, index, onVote, onQuote, onDelete }: any) {
  const isOp = post.is_op
  return (
    <div className={`glass rounded-xl fade-up ${isOp ? 'glow-box' : ''}`}
      style={{ opacity: 0, animationDelay: `${index * 20}ms`, padding: '16px 18px',
               borderLeft: isOp ? '3px solid var(--green)' : '3px solid transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                       color: isOp ? 'var(--green)' : 'var(--blue)' }}>
          {isOp ? '## OP' : `#${String(index + 1).padStart(3, '0')}`}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
          {author || 'Anonymous'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)',
                       fontFamily: "'JetBrains Mono', monospace" }}>
          {new Date(post.created_at).toLocaleString()}
        </span>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap',
                  margin: '0 0 12px', opacity: 0.9 }}>
        {post.content}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onVote(post.id, 1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                   borderRadius: 6, background: 'rgba(0,255,136,0.06)', color: 'var(--green)',
                   border: '1px solid rgba(0,255,136,0.15)', cursor: 'pointer', fontSize: 12,
                   fontWeight: 600, transition: 'all 0.15s' }}>
          ▲ {post.score}
        </button>
        <button onClick={() => onVote(post.id, -1)}
          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(248,113,113,0.06)',
                   color: 'var(--red)', border: '1px solid rgba(248,113,113,0.15)',
                   cursor: 'pointer', fontSize: 12, transition: 'all 0.15s' }}>
          ▼
        </button>
        <button onClick={() => onQuote(post.id)}
          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(96,165,250,0.06)',
                   color: 'var(--blue)', border: '1px solid rgba(96,165,250,0.15)',
                   cursor: 'pointer', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                   transition: 'all 0.15s' }}>
          &gt;&gt;{post.id.slice(0,6)}
        </button>
        <button onClick={() => { if (confirm('Delete post?')) onDelete(post.id) }}
          style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: 6, background: 'transparent',
                   color: 'var(--faint)', border: 'none', cursor: 'pointer', fontSize: 14,
                   transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--faint)')}>
          ✕
        </button>
      </div>
    </div>
  )
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>()
  const [thread,   setThread]   = useState<any>(null)
  const [posts,    setPosts]    = useState<any[]>([])
  const [users,    setUsers]    = useState<any[]>([])
  const [quoting,  setQuoting]  = useState<string | null>(null)
  const [form,     setForm]     = useState({ content: '', user_id: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    getThread(id!).then(setThread)
    getPosts({ thread_id: id, deleted: false, limit: 200 }).then(setPosts)
    getUsers({ limit: 20 }).then(setUsers)
  }
  useEffect(load, [id])

  const submit = async (e: any) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createPost({ ...form, thread_id: id, quote_id: quoting || undefined })
      toast.success('Post created')
      setForm({ content: '', user_id: form.user_id })
      setQuoting(null)
      load()
    } catch { toast.error('Error') }
    setSubmitting(false)
  }

  return (
    <div>
      {thread && (
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
            <Link to="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Boards</Link>
            <span style={{ color: 'var(--faint)' }}>›</span>
            <Link to={`/board/${thread.board_slug}`}
              style={{ color: 'var(--muted)', textDecoration: 'none', fontFamily: "'JetBrains Mono', monospace" }}>
              /{thread.board_slug}/
            </Link>
          </div>
          <div className="glass rounded-xl" style={{ padding: '18px 20px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
              {thread.thread?.title}
            </h1>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)',
                          fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: 'var(--green)', opacity: 0.8 }}>{thread.thread?.reply_count} replies</span>
              <span>/{thread.board_slug}/</span>
              {thread.thread?.locked && (
                <span className="tag-pill" style={{ background: 'rgba(248,113,113,0.1)',
                  color: 'var(--red)', border: '1px solid rgba(248,113,113,0.2)' }}>LOCKED</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {posts.map(({ post, author }: any, i: number) => (
          <PostCard key={post.id} post={post} author={author} index={i}
            onVote={(pid: string, d: number) => scorePost(pid, d).then(load)}
            onQuote={(pid: string) => setQuoting(pid)}
            onDelete={(pid: string) => softDelete(pid).then(load)}/>
        ))}
        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--faint)', fontSize: 13 }}>
            No posts yet.
          </div>
        )}
      </div>

      {/* Reply form */}
      <div className="glass-strong rounded-xl" style={{ padding: '20px', position: 'sticky', bottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)',
                         fontFamily: "'JetBrains Mono', monospace" }}>
            {quoting ? `>>Quoting ${quoting.slice(0,8)}` : 'Reply'}
          </span>
          {quoting && (
            <button onClick={() => setQuoting(null)}
              style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none',
                       cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}>
              ✕ cancel
            </button>
          )}
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select required className="chan-input" value={form.user_id}
            onChange={e => setForm({...form, user_id: e.target.value})}>
            <option value="">Post as...</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.alias}</option>)}
          </select>
          <textarea required rows={3} className="chan-input" placeholder="Write your reply..."
            value={form.content} onChange={e => setForm({...form, content: e.target.value})}
            style={{ resize: 'vertical', fontFamily: "'Inter', sans-serif" }}/>
          <button type="submit" className="btn-primary" disabled={submitting}
            style={{ alignSelf: 'flex-start' }}>
            {submitting ? 'Posting...' : 'Post Reply'}
          </button>
        </form>
      </div>
    </div>
  )
}
