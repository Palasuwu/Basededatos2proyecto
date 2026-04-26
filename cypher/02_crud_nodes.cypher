// ============================================================
// 02 — CRUD NODOS
// ============================================================

// -------------------------
// CREATE: 1 label (Board)
// Rúbrica: "Operación CREATE de nodo con 1 label"
// -------------------------
CREATE (b:Board {
  id:          randomUUID(),
  name:        'Random',
  slug:        'b',
  description: 'Anything goes, no rules',
  nsfw:        true,
  post_count:  0,
  created_at:  date('2024-03-01')
})
RETURN b;


// -------------------------
// CREATE/MERGE: 2 labels — User + Moderator
// Rúbrica: "Operación CREATE/MERGE de nodo con 2+ labels"
// -------------------------
MERGE (m:User:Moderator {id: 'mod-001'})
ON CREATE SET
  m.alias        = 'mod_zero',
  m.is_anon      = false,
  m.ip_hash      = 'abc123def456',
  m.joined_at    = date('2023-01-10'),
  m.post_count   = 0,
  m.karma        = 500,
  m.banned       = false,
  m.interests    = ['moderation', 'security'],
  m.level        = 'senior',
  m.since        = date('2023-02-01'),
  m.active_boards = ['b', 'tech', 'sci'],
  m.active       = true
RETURN m;


// -------------------------
// CREATE: nodo con 5+ propiedades (Post)
// Rúbrica: "CREATE/MERGE de nodo con por lo menos 5 propiedades"
// -------------------------
CREATE (p:Post {
  id:          randomUUID(),
  content:     'Breaking: new zero-day found in the wild. Stay safe out there.',
  created_at:  datetime(),
  score:       0,
  is_op:       true,
  deleted:     false,
  reply_count: 0,
  word_count:  12,
  flagged:     false,
  media_urls:  []
})
RETURN p;


// -------------------------
// READ: nodo único con filtro
// Rúbrica: "Visualización y consulta de nodos con filtros (1 nodo)"
// -------------------------
MATCH (b:Board {slug: 'tech'})
RETURN b;

MATCH (u:User {id: 'user-001'})
RETURN u;


// -------------------------
// READ: múltiples nodos con filtros
// Rúbrica: "múltiples nodos"
// -------------------------
MATCH (p:Post)
WHERE p.deleted = false
  AND p.score > 10
RETURN p.id, p.content, p.score, p.created_at
ORDER BY p.score DESC
LIMIT 20;

MATCH (u:User)
WHERE u.is_anon = false AND u.karma > 100
RETURN u.alias, u.karma, u.joined_at
ORDER BY u.karma DESC;

MATCH (t:Thread)
WHERE t.is_pinned = true OR t.locked = false
RETURN t.id, t.title, t.bump_order
ORDER BY t.bump_order ASC;


// -------------------------
// AGGREGATIONS
// Rúbrica: "agregaciones"
// -------------------------

// Posts por board con estadísticas
MATCH (b:Board)-[:HAS_THREAD]->(t:Thread)-[:HAS_POST]->(p:Post)
RETURN
  b.name                                             AS board,
  count(p)                                           AS total_posts,
  avg(p.score)                                       AS avg_score,
  max(p.score)                                       AS top_score,
  sum(CASE WHEN p.deleted THEN 1 ELSE 0 END)         AS deleted_count
ORDER BY total_posts DESC;

// Usuarios con más posts por board
MATCH (u:User)-[:WROTE]->(p:Post)<-[:HAS_POST]-(t:Thread)<-[:HAS_THREAD]-(b:Board)
WHERE b.slug = 'tech'
RETURN u.alias AS user, count(p) AS posts_in_board
ORDER BY posts_in_board DESC
LIMIT 10;


// -------------------------
// UPDATE: agregar propiedad a 1 nodo
// Rúbrica: "Agregar... propiedades en nodos"
// -------------------------
MATCH (p:Post {id: 'post-001'})
SET p.pinned = true
RETURN p;


// -------------------------
// UPDATE: actualizar propiedad en 1 nodo
// Rúbrica: "Actualizar... propiedades en nodos"
// -------------------------
MATCH (u:User {id: 'user-001'})
SET u.karma = u.karma + 10
RETURN u;


// -------------------------
// UPDATE: actualizar propiedad en MÚLTIPLES nodos
// Rúbrica: "Gestión de propiedades en nodos (... para 1 o múltiples nodos)"
// -------------------------
MATCH (p:Post)<-[:HAS_POST]-(t:Thread {id: 'thread-001'})
SET p.flagged = true
RETURN count(p) AS flagged_posts;

// Incrementar bump_order de todos los threads no pineados
MATCH (t:Thread)
WHERE t.is_pinned = false
SET t.bump_order = t.bump_order + 1
RETURN count(t) AS bumped;


// -------------------------
// UPDATE: eliminar propiedad de 1 nodo
// Rúbrica: "Eliminar... propiedades en nodos"
// -------------------------
MATCH (p:Post {id: 'post-001'})
REMOVE p.pinned
RETURN p;

// Soft-delete: borrar contenido y marcar deleted
MATCH (p:Post {id: 'post-001'})
SET p.deleted = true
REMOVE p.content
RETURN p;


// -------------------------
// DELETE: 1 nodo
// Rúbrica: "Eliminación de nodos (1 nodo y múltiples nodos)"
// -------------------------
MATCH (t:Tag {name: 'spam'})
DETACH DELETE t;


// -------------------------
// DELETE: múltiples nodos
// Rúbrica: "múltiples nodos"
// -------------------------
MATCH (r:Reaction)
WHERE r.created_at < datetime() - duration('P90D')
DETACH DELETE r;

MATCH (p:Post)
WHERE p.deleted = true
  AND p.created_at < datetime() - duration('P30D')
DETACH DELETE p;
