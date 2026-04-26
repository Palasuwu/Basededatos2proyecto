// ============================================================
// 01 — CARGA DE DATOS DESDE CSV
// Rúbrica: "Carga de datos mediante CSV (creación de nodos y relaciones)"
// Ejecutar en orden. Ajustar la URL base según donde estén los CSVs.
// AuraDB: subir CSVs a un bucket público o usar file:/// en local.
// ============================================================

// --- NODOS: Board ---
LOAD CSV WITH HEADERS FROM 'file:///boards.csv' AS row
CREATE (:Board {
  id:          row.id,
  name:        row.name,
  slug:        row.slug,
  description: row.description,
  nsfw:        toBoolean(row.nsfw),
  post_count:  toInteger(row.post_count),
  created_at:  date(row.created_at)
});

// --- NODOS: IP ---
LOAD CSV WITH HEADERS FROM 'file:///ips.csv' AS row
CREATE (:IP {
  address:    row.address,
  country:    row.country,
  isp:        row.isp,
  is_proxy:   toBoolean(row.is_proxy),
  risk_score: toFloat(row.risk_score),
  first_seen: date(row.first_seen)
});

// --- NODOS: User ---
LOAD CSV WITH HEADERS FROM 'file:///users.csv' AS row
CREATE (:User {
  id:         row.id,
  alias:      row.alias,
  is_anon:    toBoolean(row.is_anon),
  ip_hash:    row.ip_hash,
  joined_at:  date(row.joined_at),
  post_count: toInteger(row.post_count),
  karma:      toInteger(row.karma),
  banned:     toBoolean(row.banned),
  interests:  split(row.interests, '|')
});

// --- NODOS: Moderator (multi-label User + Moderator) ---
LOAD CSV WITH HEADERS FROM 'file:///moderators.csv' AS row
CREATE (:User:Moderator {
  id:            row.id,
  alias:         row.alias,
  is_anon:       false,
  ip_hash:       row.ip_hash,
  joined_at:     date(row.joined_at),
  post_count:    toInteger(row.post_count),
  karma:         toInteger(row.karma),
  banned:        false,
  interests:     split(row.interests, '|'),
  level:         row.level,
  since:         date(row.since),
  active_boards: split(row.active_boards, '|'),
  active:        toBoolean(row.active)
});

// --- NODOS: Tag ---
LOAD CSV WITH HEADERS FROM 'file:///tags.csv' AS row
CREATE (:Tag {
  name:       row.name,
  color:      row.color,
  count:      toInteger(row.count),
  active:     toBoolean(row.active),
  created_at: date(row.created_at)
});

// --- NODOS: Thread ---
LOAD CSV WITH HEADERS FROM 'file:///threads.csv' AS row
CREATE (:Thread {
  id:         row.id,
  title:      row.title,
  created_at: datetime(row.created_at),
  is_pinned:  toBoolean(row.is_pinned),
  tags:       split(row.tags, '|'),
  bump_order: toInteger(row.bump_order),
  reply_count: toInteger(row.reply_count),
  locked:     toBoolean(row.locked)
});

// --- NODOS: Post ---
LOAD CSV WITH HEADERS FROM 'file:///posts.csv' AS row
CREATE (:Post {
  id:          row.id,
  content:     row.content,
  created_at:  datetime(row.created_at),
  score:       toInteger(row.score),
  is_op:       toBoolean(row.is_op),
  deleted:     toBoolean(row.deleted),
  reply_count: toInteger(row.reply_count),
  word_count:  toInteger(row.word_count),
  flagged:     toBoolean(row.flagged),
  media_urls:  split(row.media_urls, '|')
});

// --- NODOS: File ---
LOAD CSV WITH HEADERS FROM 'file:///files.csv' AS row
CREATE (:File {
  id:          row.id,
  url:         row.url,
  type:        row.type,
  size_kb:     toFloat(row.size_kb),
  uploaded_at: date(row.uploaded_at),
  width:       toInteger(row.width),
  height:      toInteger(row.height),
  checksum:    row.checksum
});

// --- NODOS: Report ---
LOAD CSV WITH HEADERS FROM 'file:///reports.csv' AS row
CREATE (:Report {
  id:         row.id,
  reason:     row.reason,
  created_at: datetime(row.created_at),
  status:     row.status,
  resolved:   toBoolean(row.resolved),
  notes:      row.notes,
  priority:   toInteger(row.priority)
});

// --- NODOS: Ban ---
LOAD CSV WITH HEADERS FROM 'file:///bans.csv' AS row
CREATE (:Ban {
  id:         row.id,
  reason:     row.reason,
  starts_at:  datetime(row.starts_at),
  ends_at:    date(row.ends_at),
  scope:      row.scope,
  permanent:  toBoolean(row.permanent),
  appeal_url: row.appeal_url
});

// --- NODOS: Reaction ---
LOAD CSV WITH HEADERS FROM 'file:///reactions.csv' AS row
CREATE (:Reaction {
  id:         row.id,
  type:       row.type,
  created_at: datetime(row.created_at),
  anon_id:    row.anon_id,
  weight:     toFloat(row.weight),
  source:     row.source
});

// ============================================================
// RELACIONES DESDE CSV
// ============================================================

// Board -[HAS_THREAD]-> Thread
LOAD CSV WITH HEADERS FROM 'file:///rel_board_thread.csv' AS row
MATCH (b:Board {id: row.board_id}), (t:Thread {id: row.thread_id})
CREATE (b)-[:HAS_THREAD {
  pinned:   toBoolean(row.pinned),
  order:    toInteger(row.order),
  added_at: date(row.added_at)
}]->(t);

// Thread -[HAS_POST]-> Post
LOAD CSV WITH HEADERS FROM 'file:///rel_thread_post.csv' AS row
MATCH (t:Thread {id: row.thread_id}), (p:Post {id: row.post_id})
CREATE (t)-[:HAS_POST {
  position: toInteger(row.position),
  is_op:    toBoolean(row.is_op),
  added_at: datetime(row.added_at)
}]->(p);

// User -[WROTE]-> Post
LOAD CSV WITH HEADERS FROM 'file:///rel_user_post.csv' AS row
MATCH (u:User {id: row.user_id}), (p:Post {id: row.post_id})
CREATE (u)-[:WROTE {
  at:      datetime(row.at),
  from_ip: row.from_ip,
  device:  row.device
}]->(p);

// User -[CREATED]-> Thread
LOAD CSV WITH HEADERS FROM 'file:///rel_user_thread.csv' AS row
MATCH (u:User {id: row.user_id}), (t:Thread {id: row.thread_id})
CREATE (u)-[:CREATED {
  at:      datetime(row.at),
  from_ip: row.from_ip,
  anon_id: row.anon_id
}]->(t);

// Post -[QUOTES]-> Post
LOAD CSV WITH HEADERS FROM 'file:///rel_post_quotes.csv' AS row
MATCH (p1:Post {id: row.from_post_id}), (p2:Post {id: row.to_post_id})
CREATE (p1)-[:QUOTES {
  at:       datetime(row.at),
  context:  row.context,
  resolved: toBoolean(row.resolved)
}]->(p2);

// Post -[HAS_FILE]-> File
LOAD CSV WITH HEADERS FROM 'file:///rel_post_file.csv' AS row
MATCH (p:Post {id: row.post_id}), (f:File {id: row.file_id})
CREATE (p)-[:HAS_FILE {
  attached_at: datetime(row.attached_at),
  primary:     toBoolean(row.primary),
  order:       toInteger(row.order)
}]->(f);

// Thread -[TAGGED_WITH]-> Tag
LOAD CSV WITH HEADERS FROM 'file:///rel_thread_tag.csv' AS row
MATCH (t:Thread {id: row.thread_id}), (tg:Tag {name: row.tag_name})
CREATE (t)-[:TAGGED_WITH {
  added_at:  date(row.added_at),
  added_by:  row.added_by,
  relevance: toFloat(row.relevance)
}]->(tg);

// Report -[TARGETS]-> Post
LOAD CSV WITH HEADERS FROM 'file:///rel_report_post.csv' AS row
MATCH (r:Report {id: row.report_id}), (p:Post {id: row.post_id})
CREATE (r)-[:TARGETS {
  at:           datetime(row.at),
  severity:     row.severity,
  auto_flagged: toBoolean(row.auto_flagged)
}]->(p);

// Moderator -[MANAGES]-> Board
LOAD CSV WITH HEADERS FROM 'file:///rel_mod_board.csv' AS row
MATCH (m:User:Moderator {id: row.mod_id}), (b:Board {id: row.board_id})
CREATE (m)-[:MANAGES {
  since:  date(row.since),
  role:   row.role,
  active: toBoolean(row.active)
}]->(b);

// Moderator -[ISSUED_BAN]-> Ban
LOAD CSV WITH HEADERS FROM 'file:///rel_mod_ban.csv' AS row
MATCH (m:User:Moderator {id: row.mod_id}), (ban:Ban {id: row.ban_id})
CREATE (m)-[:ISSUED_BAN {
  at:             datetime(row.at),
  reason:         row.reason,
  appeal_allowed: toBoolean(row.appeal_allowed)
}]->(ban);

// Ban -[BANS]-> User
LOAD CSV WITH HEADERS FROM 'file:///rel_ban_user.csv' AS row
MATCH (ban:Ban {id: row.ban_id}), (u:User {id: row.user_id})
CREATE (ban)-[:BANS {
  effective_at: datetime(row.effective_at),
  scope:        row.scope,
  notified:     toBoolean(row.notified)
}]->(u);

// User -[REPORTED]-> Report
LOAD CSV WITH HEADERS FROM 'file:///rel_user_report.csv' AS row
MATCH (u:User {id: row.user_id}), (r:Report {id: row.report_id})
CREATE (u)-[:REPORTED {
  at:        datetime(row.at),
  anonymous: toBoolean(row.anonymous),
  ip_hash:   row.ip_hash
}]->(r);

// User -[FOLLOWS]-> Board
LOAD CSV WITH HEADERS FROM 'file:///rel_user_board.csv' AS row
MATCH (u:User {id: row.user_id}), (b:Board {id: row.board_id})
CREATE (u)-[:FOLLOWS {
  since:    date(row.since),
  notify:   toBoolean(row.notify),
  priority: toInteger(row.priority)
}]->(b);

// Reaction -[REACTED_TO]-> Post
LOAD CSV WITH HEADERS FROM 'file:///rel_reaction_post.csv' AS row
MATCH (rc:Reaction {id: row.reaction_id}), (p:Post {id: row.post_id})
CREATE (rc)-[:REACTED_TO {
  at:      datetime(row.at),
  anon_id: row.anon_id,
  weight:  toFloat(row.weight)
}]->(p);

// Post -[POSTED_FROM]-> IP
LOAD CSV WITH HEADERS FROM 'file:///rel_post_ip.csv' AS row
MATCH (p:Post {id: row.post_id}), (ip:IP {address: row.ip_address})
CREATE (p)-[:POSTED_FROM {
  at:      datetime(row.at),
  proxy:   toBoolean(row.proxy),
  country: row.country
}]->(ip);
