// ============================================================
// 04 — QUERIES DE PRESENTACIÓN EN VIVO
// Rúbrica: "4-6 Consultas Cypher en vivo (2 por integrante)"
// ============================================================
// Distribuir: Adrián (Q1, Q2) | Jorge (Q3, Q4) | Wilson (Q5, Q6)
// ============================================================


// ------------------------------------------------------------
// Q1 — ADRIÁN
// Detección de IPs sospechosas (brigading / spam)
// IPs que postearon en más de 3 boards distintos
// → Caso de uso del nodo IP para detectar fraude (lo mencionamos en clase)
// ------------------------------------------------------------
MATCH (ip:IP)<-[:POSTED_FROM]-(p:Post)<-[:HAS_POST]-(:Thread)<-[:HAS_THREAD]-(b:Board)
WITH ip,
     collect(DISTINCT b.slug) AS boards_hit,
     count(p)                 AS total_posts,
     avg(ip.risk_score)       AS risk
WHERE size(boards_hit) > 3
RETURN
  ip.address    AS ip,
  ip.country    AS country,
  boards_hit,
  total_posts,
  round(risk, 2) AS risk_score
ORDER BY total_posts DESC
LIMIT 10;


// ------------------------------------------------------------
// Q2 — ADRIÁN
// Threads más activos en las últimas 24 horas por board
// ------------------------------------------------------------
MATCH (b:Board)-[:HAS_THREAD]->(t:Thread)-[:HAS_POST]->(p:Post)
WHERE p.created_at >= datetime() - duration('PT24H')
WITH b, t, count(p) AS recent_posts, max(p.created_at) AS last_activity
ORDER BY recent_posts DESC
RETURN
  b.name          AS board,
  t.title         AS thread,
  recent_posts,
  last_activity
LIMIT 15;


// ------------------------------------------------------------
// Q3 — JORGE
// Cadena de quotes más larga (árbol de respuestas)
// Muestra qué posts generaron más conversación encadenada
// ------------------------------------------------------------
MATCH path = (root:Post)-[:QUOTES*1..8]->(leaf:Post)
WHERE NOT (root)<-[:QUOTES]-()     // root es el post original
WITH path, length(path) AS depth
ORDER BY depth DESC
LIMIT 5
RETURN
  [n IN nodes(path) | n.id]      AS chain_ids,
  [n IN nodes(path) | n.score]   AS scores,
  depth;


// ------------------------------------------------------------
// Q4 — JORGE
// Usuarios más influyentes: posts más citados y score acumulado
// (PageRank manual sobre la red de quotes)
// ------------------------------------------------------------
MATCH (u:User)-[:WROTE]->(p:Post)<-[:QUOTES]-(reply:Post)
WITH u,
     count(DISTINCT reply) AS times_quoted,
     sum(p.score)          AS total_score,
     count(DISTINCT p)     AS posts_with_replies
WHERE times_quoted > 1
RETURN
  u.alias           AS user,
  times_quoted,
  total_score,
  posts_with_replies,
  round(toFloat(times_quoted) / posts_with_replies, 2) AS quote_rate
ORDER BY times_quoted DESC
LIMIT 10;


// ------------------------------------------------------------
// Q5 — WILSON
// Boards sin moderador asignado (riesgo de contenido sin control)
// ------------------------------------------------------------
MATCH (b:Board)
WHERE NOT (b)<-[:MANAGES]-(:User:Moderator)
OPTIONAL MATCH (b)-[:HAS_THREAD]->(t:Thread)-[:HAS_POST]->(p:Post)
WITH b, count(p) AS total_posts
RETURN
  b.name         AS board_sin_moderador,
  b.nsfw         AS es_nsfw,
  b.created_at   AS creado,
  total_posts
ORDER BY total_posts DESC;


// ------------------------------------------------------------
// Q6 — WILSON
// Distribución de reports por status y board con tasa de resolución
// ------------------------------------------------------------
MATCH (b:Board)-[:HAS_THREAD]->(:Thread)-[:HAS_POST]->(p:Post)<-[:TARGETS]-(r:Report)
WITH
  b.name   AS board,
  r.status AS status,
  r.resolved AS resolved,
  count(r) AS total
WITH
  board,
  sum(total)                                             AS total_reports,
  sum(CASE WHEN resolved THEN total ELSE 0 END)          AS resolved_count,
  collect({status: status, count: total})                AS breakdown
RETURN
  board,
  total_reports,
  resolved_count,
  round(toFloat(resolved_count) / total_reports * 100, 1) AS resolution_pct,
  breakdown
ORDER BY total_reports DESC;


// ============================================================
// EXTRAS — Algoritmo de Data Science (PageRank con GDS)
// Rúbrica: "Implementación de Algoritmo de Data Science +10 pts"
// ============================================================

// Paso 1: Crear grafo en memoria (solo Posts y sus quotes)
CALL gds.graph.project(
  'post-quotes-graph',
  'Post',
  {
    QUOTES: { orientation: 'NATURAL' }
  }
);

// Paso 2: Correr PageRank
CALL gds.pageRank.stream('post-quotes-graph', {
  maxIterations: 20,
  dampingFactor: 0.85
})
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS post, score
RETURN post.id, post.content, round(score, 4) AS pagerank
ORDER BY pagerank DESC
LIMIT 10;

// Paso 3: Escribir score de vuelta en los nodos
CALL gds.pageRank.write('post-quotes-graph', {
  maxIterations: 20,
  dampingFactor: 0.85,
  writeProperty: 'pagerank_score'
})
YIELD nodePropertiesWritten, ranIterations;

// Paso 4: Limpiar grafo de memoria
CALL gds.graph.drop('post-quotes-graph');

// Alternativa — Betweenness Centrality (qué posts "conectan" más conversaciones)
CALL gds.graph.project('post-centrality', 'Post', 'QUOTES');
CALL gds.betweenness.stream('post-centrality')
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS post, score
RETURN post.id, round(score, 2) AS betweenness
ORDER BY betweenness DESC
LIMIT 10;
CALL gds.graph.drop('post-centrality');
