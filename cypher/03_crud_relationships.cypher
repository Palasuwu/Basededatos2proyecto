// ============================================================
// 03 — CRUD RELACIONES
// ============================================================

// -------------------------
// CREATE: relación con 3 propiedades
// Rúbrica: "Operación CREATE de relación entre 2 nodos con 3 propiedades"
// -------------------------

// User -[WROTE]-> Post
MATCH (u:User {id: 'user-001'}), (p:Post {id: 'post-001'})
CREATE (u)-[:WROTE {
  at:      datetime(),
  from_ip: '192.168.1.100',
  device:  'desktop'
}]->(p)
RETURN u, p;

// User -[FOLLOWS]-> Board
MATCH (u:User {id: 'user-001'}), (b:Board {slug: 'tech'})
CREATE (u)-[:FOLLOWS {
  since:    date(),
  notify:   true,
  priority: 1
}]->(b)
RETURN u, b;

// Thread -[TAGGED_WITH]-> Tag
MATCH (t:Thread {id: 'thread-001'}), (tg:Tag {name: 'science'})
CREATE (t)-[:TAGGED_WITH {
  added_at:  date(),
  added_by:  'mod_zero',
  relevance: 0.95
}]->(tg)
RETURN t, tg;

// Report -[TARGETS]-> Post
MATCH (r:Report {id: 'report-001'}), (p:Post {id: 'post-001'})
CREATE (r)-[:TARGETS {
  at:           datetime(),
  severity:     'high',
  auto_flagged: false
}]->(r)
RETURN r, p;

// Post -[QUOTES]-> Post
MATCH (p1:Post {id: 'post-002'}), (p2:Post {id: 'post-001'})
CREATE (p1)-[:QUOTES {
  at:       datetime(),
  context:  'Replying to your point about...',
  resolved: false
}]->(p2)
RETURN p1, p2;

// Post -[POSTED_FROM]-> IP
MATCH (p:Post {id: 'post-001'}), (ip:IP {address: '192.168.1.100'})
CREATE (p)-[:POSTED_FROM {
  at:      datetime(),
  proxy:   false,
  country: 'GT'
}]->(ip)
RETURN p, ip;


// -------------------------
// READ relaciones: verificar que existen
// -------------------------
MATCH (u:User {id: 'user-001'})-[r:WROTE]->(p:Post)
RETURN u.alias, type(r), r.at, p.id
LIMIT 10;

MATCH (b:Board {slug: 'tech'})<-[r:MANAGES]-(m:User:Moderator)
RETURN m.alias, r.role, r.since;


// -------------------------
// UPDATE: agregar propiedad a 1 relación
// Rúbrica: "Gestión de relaciones (Agregar... propiedades en 1 o múltiples relaciones)"
// -------------------------
MATCH (u:User {id: 'user-001'})-[r:WROTE]->(p:Post {id: 'post-001'})
SET r.verified = true
RETURN r;

MATCH (u:User)-[r:FOLLOWS]->(b:Board {slug: 'tech'})
WHERE u.id = 'user-001'
SET r.muted = false
RETURN r;


// -------------------------
// UPDATE: actualizar propiedad en MÚLTIPLES relaciones
// Rúbrica: "múltiples relaciones"
// -------------------------

// Cambiar device a 'mobile' en todos los posts de una IP
MATCH (u:User)-[r:WROTE]->(p:Post)
WHERE r.from_ip = '192.168.1.100'
SET r.device = 'mobile'
RETURN count(r) AS updated;

// Marcar como notified todos los bans activos de un mod
MATCH (m:User:Moderator {id: 'mod-001'})-[r:ISSUED_BAN]->(ban:Ban)
SET r.notified = true
RETURN count(r) AS updated;

// Actualizar relevance en todas las tags de un thread
MATCH (t:Thread {id: 'thread-001'})-[r:TAGGED_WITH]->(:Tag)
SET r.relevance = r.relevance * 0.9
RETURN count(r) AS updated;


// -------------------------
// UPDATE: eliminar propiedad de relación
// Rúbrica: "Eliminar propiedades en 1 o múltiples relaciones"
// -------------------------

// Quitar notify de 1 relación
MATCH (u:User {id: 'user-001'})-[r:FOLLOWS]->(b:Board {slug: 'tech'})
REMOVE r.notify
RETURN r;

// Quitar campo legacy 'muted' de todas las relaciones FOLLOWS
MATCH ()-[r:FOLLOWS]->()
WHERE r.muted IS NOT NULL
REMOVE r.muted
RETURN count(r) AS cleaned;


// -------------------------
// DELETE: 1 relación
// Rúbrica: "Eliminación de relaciones (1 relación y múltiples relaciones)"
// -------------------------
MATCH (u:User {id: 'user-001'})-[r:FOLLOWS]->(b:Board {slug: 'tech'})
DELETE r;


// -------------------------
// DELETE: múltiples relaciones
// Rúbrica: "múltiples relaciones"
// -------------------------

// Borrar todas las reactions sobre posts eliminados
MATCH (rc:Reaction)-[r:REACTED_TO]->(p:Post {deleted: true})
DELETE r;

// Borrar todos los FOLLOWS de usuarios baneados
MATCH (u:User {banned: true})-[r:FOLLOWS]->()
DELETE r;

// Borrar todas las relaciones HAS_FILE de posts purgados
MATCH (p:Post {deleted: true})-[r:HAS_FILE]->(:File)
DELETE r;
