from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import run_query as q

router = APIRouter(prefix="/api/posts", tags=["posts"])

async def _q_unused(query, **params):  # replaced
    async with driver.session(database="neo4j") as s:
        r = await s.run(query, **params)
        return await r.data()

class PostCreate(BaseModel):
    content: str
    thread_id: str
    user_id: str
    is_op: bool = False
    quote_id: Optional[str] = None

@router.get("")
async def list_posts(
    thread_id: Optional[str] = None,
    min_score: Optional[int] = None,
    flagged: Optional[bool] = None,
    deleted: Optional[bool] = False,
    limit: int = Query(50, le=200)
):
    filters = ["p.deleted = $deleted"]
    if thread_id: filters.append("t.id = $thread_id")
    if min_score is not None: filters.append("p.score >= $min_score")
    if flagged is not None: filters.append("p.flagged = $flagged")
    w = "WHERE " + " AND ".join(filters)
    rows = await q(f"""
        MATCH (t:Thread)-[:HAS_POST]->(p:Post)
        {w}
        OPTIONAL MATCH (u:User)-[:WROTE]->(p)
        RETURN p, u.alias AS author, t.id AS thread_id
        ORDER BY p.created_at ASC LIMIT $limit
    """, thread_id=thread_id, min_score=min_score,
       flagged=flagged, deleted=deleted, limit=limit)
    return [{"post": dict(r["p"]), "author": r["author"],
             "thread_id": r["thread_id"]} for r in rows]

@router.get("/{post_id}")
async def get_post(post_id: str):
    rows = await q("""
        MATCH (p:Post {id:$id})
        OPTIONAL MATCH (u:User)-[:WROTE]->(p)
        OPTIONAL MATCH (t:Thread)-[:HAS_POST]->(p)
        RETURN p, u.alias AS author, t.id AS thread_id
    """, id=post_id)
    if not rows: raise HTTPException(404)
    return {"post": dict(rows[0]["p"]), "author": rows[0]["author"],
            "thread_id": rows[0]["thread_id"]}

@router.post("", status_code=201)
async def create_post(body: PostCreate):
    rows = await q("""
        MATCH (t:Thread {id:$thread_id}), (u:User {id:$user_id})
        CREATE (p:Post {
            id:randomUUID(), content:$content, created_at:datetime(),
            score:0, is_op:$is_op, deleted:false, reply_count:0,
            word_count:size(split($content,' ')), flagged:false, media_urls:[]
        })
        CREATE (t)-[:HAS_POST {position:t.reply_count+1, is_op:$is_op, added_at:datetime()}]->(p)
        CREATE (u)-[:WROTE {at:datetime(), from_ip:'127.0.0.1', device:'web'}]->(p)
        SET t.reply_count = t.reply_count + 1
        RETURN p
    """, **body.dict())
    if not rows: raise HTTPException(400, "Thread or User not found")
    post_id = dict(rows[0]["p"])["id"]
    if body.quote_id:
        await q("""
            MATCH (p1:Post {id:$pid}), (p2:Post {id:$qid})
            CREATE (p1)-[:QUOTES {at:datetime(), context:'reply', resolved:false}]->(p2)
        """, pid=post_id, qid=body.quote_id)
    return dict(rows[0]["p"])

@router.patch("/{post_id}/score")
async def update_score(post_id: str, delta: int = 1):
    rows = await q("MATCH (p:Post {id:$id}) SET p.score = p.score + $d RETURN p",
                   id=post_id, d=delta)
    return dict(rows[0]["p"])

@router.patch("/{post_id}/flag")
async def flag_post(post_id: str):
    rows = await q("MATCH (p:Post {id:$id}) SET p.flagged = true RETURN p", id=post_id)
    return dict(rows[0]["p"])

@router.delete("/{post_id}/soft")
async def soft_delete(post_id: str):
    rows = await q("""
        MATCH (p:Post {id:$id})
        SET p.deleted = true, p.content = '[deleted]'
        RETURN p
    """, id=post_id)
    return dict(rows[0]["p"])

@router.delete("/{post_id}")
async def delete_post(post_id: str):
    await q("MATCH (p:Post {id:$id}) DETACH DELETE p", id=post_id)
    return {"deleted": post_id}

@router.delete("")
async def delete_multiple_posts(
    deleted_only: bool = True,
    flagged_only: bool = False,
    thread_id: Optional[str] = None
):
    filters = []
    if deleted_only: filters.append("p.deleted = true")
    if flagged_only: filters.append("p.flagged = true")
    if thread_id: filters.append("EXISTS {MATCH (t:Thread {id:$tid})-[:HAS_POST]->(p)}")
    w = "WHERE " + " AND ".join(filters) if filters else ""
    rows = await q(f"""
        MATCH (p:Post) {w}
        WITH p, count(p) AS n
        DETACH DELETE p
        RETURN n
    """, tid=thread_id)
    return {"deleted_count": rows[0]["n"] if rows else 0}
