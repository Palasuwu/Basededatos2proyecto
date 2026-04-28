from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import run_query as q

router = APIRouter(prefix="/api/threads", tags=["threads"])

async def _q_unused(query, **params):  # replaced
    async with driver.session(database="neo4j") as s:
        r = await s.run(query, **params)
        return await r.data()

class ThreadCreate(BaseModel):
    title: str
    board_slug: str
    user_id: str
    tags: List[str] = []
    is_pinned: bool = False

@router.get("")
async def list_threads(
    board_slug: Optional[str] = None,
    pinned_only: bool = False,
    limit: int = Query(30, le=100)
):
    where = []
    if board_slug: where.append("b.slug = $slug")
    if pinned_only: where.append("t.is_pinned = true")
    w = "WHERE " + " AND ".join(where) if where else ""
    rows = await q(f"""
        MATCH (b:Board)-[:HAS_THREAD]->(t:Thread)
        {w}
        RETURN t, b.slug AS board_slug, b.name AS board_name
        ORDER BY t.is_pinned DESC, t.bump_order ASC
        LIMIT $limit
    """, slug=board_slug, limit=limit)
    return [{"thread": dict(r["t"]), "board_slug": r["board_slug"],
             "board_name": r["board_name"]} for r in rows]

@router.get("/{thread_id}")
async def get_thread(thread_id: str):
    rows = await q("""
        MATCH (b:Board)-[:HAS_THREAD]->(t:Thread {id:$id})
        RETURN t, b.name AS board_name, b.slug AS board_slug
    """, id=thread_id)
    if not rows: raise HTTPException(404)
    return {"thread": dict(rows[0]["t"]), "board_slug": rows[0]["board_slug"],
            "board_name": rows[0]["board_name"]}

@router.post("", status_code=201)
async def create_thread(body: ThreadCreate):
    rows = await q("""
        MATCH (b:Board {slug:$board_slug}), (u:User {id:$user_id})
        CREATE (t:Thread {
            id: randomUUID(), title:$title, created_at:datetime(),
            is_pinned:$is_pinned, tags:$tags, bump_order:1,
            reply_count:0, locked:false
        })
        CREATE (b)-[:HAS_THREAD {pinned:$is_pinned, order:1, added_at:date()}]->(t)
        CREATE (u)-[:CREATED {at:datetime(), from_ip:'127.0.0.1', anon_id:randomUUID()}]->(t)
        RETURN t
    """, **body.dict())
    if not rows: raise HTTPException(400, "Board or User not found")
    return dict(rows[0]["t"])

@router.patch("/{thread_id}/lock")
async def toggle_lock(thread_id: str, locked: bool):
    rows = await q("MATCH (t:Thread {id:$id}) SET t.locked=$locked RETURN t",
                   id=thread_id, locked=locked)
    return dict(rows[0]["t"])

@router.delete("/{thread_id}")
async def delete_thread(thread_id: str):
    await q("MATCH (t:Thread {id:$id}) DETACH DELETE t", id=thread_id)
    return {"deleted": thread_id}
