from fastapi import APIRouter
from database import run_query as q

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

async def _q_unused(query, **params):  # replaced
    async with driver.session(database="neo4j") as s:
        r = await s.run(query, **params)
        return await r.data()

@router.get("/stats")
async def global_stats():
    nodes = await q("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY count DESC")
    rels   = await q("MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count ORDER BY count DESC")
    total_n = await q("MATCH (n) RETURN count(n) AS total")
    total_r = await q("MATCH ()-[r]->() RETURN count(r) AS total")
    isolated = await q("MATCH (n) WHERE NOT (n)--() RETURN count(n) AS total")
    return {
        "nodes_by_label": nodes,
        "rels_by_type": rels,
        "total_nodes": total_n[0]["total"],
        "total_rels": total_r[0]["total"],
        "isolated_nodes": isolated[0]["total"],
    }

# Q1 — IPs sospechosas (brigading)
@router.get("/suspicious-ips")
async def suspicious_ips():
    return await q("""
        MATCH (ip:IP)<-[:POSTED_FROM]-(p:Post)<-[:HAS_POST]-(:Thread)<-[:HAS_THREAD]-(b:Board)
        WITH ip, collect(DISTINCT b.slug) AS boards_hit, count(p) AS total_posts
        WHERE size(boards_hit) > 2
        RETURN ip.address AS ip, ip.country AS country,
               boards_hit, total_posts,
               round(ip.risk_score * 100, 1) AS risk_pct
        ORDER BY total_posts DESC LIMIT 15
    """)

# Q2 — Threads más activos últimas 24h
@router.get("/active-threads")
async def active_threads():
    return await q("""
        MATCH (b:Board)-[:HAS_THREAD]->(t:Thread)-[:HAS_POST]->(p:Post)
        WHERE p.created_at >= datetime() - duration('P365D')
        WITH b, t, count(p) AS recent_posts, max(p.created_at) AS last_activity
        ORDER BY recent_posts DESC
        RETURN b.name AS board, t.title AS thread,
               t.id AS thread_id, recent_posts,
               toString(last_activity) AS last_activity
        LIMIT 15
    """)

# Q3 — Cadenas de quotes más largas
@router.get("/quote-chains")
async def quote_chains():
    return await q("""
        MATCH path = (root:Post)-[:QUOTES*1..6]->(leaf:Post)
        WHERE NOT (root)<-[:QUOTES]-()
        WITH path, length(path) AS depth
        ORDER BY depth DESC LIMIT 5
        RETURN [n IN nodes(path) | n.id] AS chain,
               [n IN nodes(path) | n.score] AS scores, depth
    """)

# Q4 — Usuarios más influyentes
@router.get("/top-users")
async def top_users():
    return await q("""
        MATCH (u:User)-[:WROTE]->(p:Post)<-[:QUOTES]-(reply:Post)
        WITH u, count(DISTINCT reply) AS times_quoted,
             sum(p.score) AS total_score,
             count(DISTINCT p) AS posts_with_replies
        WHERE times_quoted > 0
        RETURN u.alias AS user, u.id AS user_id,
               times_quoted, total_score, posts_with_replies
        ORDER BY times_quoted DESC LIMIT 10
    """)

# Q5 — Boards sin moderador
@router.get("/unmoderated-boards")
async def unmoderated_boards():
    return await q("""
        MATCH (b:Board)
        WHERE NOT (b)<-[:MANAGES]-(:User:Moderator)
        OPTIONAL MATCH (b)-[:HAS_THREAD]->(:Thread)-[:HAS_POST]->(p:Post)
        WITH b, count(p) AS total_posts
        RETURN b.name AS board, b.nsfw AS nsfw,
               toString(b.created_at) AS created_at, total_posts
        ORDER BY total_posts DESC
    """)

# Q6 — Distribución de reports por board
@router.get("/reports-distribution")
async def reports_distribution():
    return await q("""
        MATCH (b:Board)-[:HAS_THREAD]->(:Thread)-[:HAS_POST]->(p:Post)<-[:TARGETS]-(r:Report)
        WITH b.name AS board, r.status AS status, r.resolved AS resolved, count(r) AS total
        WITH board,
             sum(total) AS total_reports,
             sum(CASE WHEN resolved THEN total ELSE 0 END) AS resolved_count,
             collect({status:status, count:total}) AS breakdown
        RETURN board, total_reports, resolved_count,
               round(toFloat(resolved_count)/total_reports*100, 1) AS resolution_pct,
               breakdown
        ORDER BY total_reports DESC
    """)

# PageRank con GDS (requiere plugin instalado)
@router.get("/pagerank")
async def pagerank():
    try:
        await q("""
            CALL gds.graph.drop('post-graph', false) YIELD graphName
        """)
    except Exception:
        pass
    try:
        await q("""
            CALL gds.graph.project('post-graph','Post',{QUOTES:{orientation:'NATURAL'}})
        """)
        results = await q("""
            CALL gds.pageRank.stream('post-graph',{maxIterations:20,dampingFactor:0.85})
            YIELD nodeId, score
            WITH gds.util.asNode(nodeId) AS post, score
            WHERE score > 0.15
            RETURN post.id AS post_id,
                   left(post.content, 80) AS preview,
                   round(score,4) AS pagerank
            ORDER BY pagerank DESC LIMIT 10
        """)
        await q("CALL gds.graph.drop('post-graph')")
        return {"status": "ok", "results": results}
    except Exception as e:
        return {"status": "gds_not_installed",
                "message": "Instala el plugin Graph Data Science en Neo4j Desktop",
                "error": str(e)}

# Agregaciones por board
@router.get("/board-stats")
async def board_stats():
    return await q("""
        MATCH (b:Board)-[:HAS_THREAD]->(t:Thread)-[:HAS_POST]->(p:Post)
        RETURN b.name AS board,
               count(DISTINCT t) AS threads,
               count(p)          AS posts,
               round(avg(p.score),1)   AS avg_score,
               max(p.score)            AS top_score,
               sum(CASE WHEN p.deleted THEN 1 ELSE 0 END) AS deleted_posts
        ORDER BY posts DESC
    """)
