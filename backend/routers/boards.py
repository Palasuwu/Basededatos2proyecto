from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import run_query as q

router = APIRouter(prefix="/api/boards", tags=["boards"])

class BoardCreate(BaseModel):
    name: str
    slug: str
    description: str
    nsfw: bool = False

async def _q_unused(query, **params):  # replaced
    async with driver.session(database="neo4j") as s:
        r = await s.run(query, **params)
        return await r.data()

@router.get("")
async def list_boards():
    rows = await q("MATCH (b:Board) RETURN b ORDER BY b.name")
    return [dict(r["b"]) for r in rows]

@router.get("/{slug}")
async def get_board(slug: str):
    rows = await q("MATCH (b:Board {slug:$slug}) RETURN b", slug=slug)
    if not rows: raise HTTPException(404, "Board not found")
    return dict(rows[0]["b"])

@router.get("/{slug}/stats")
async def board_stats(slug: str):
    rows = await q("""
        MATCH (b:Board {slug:$slug})-[:HAS_THREAD]->(t:Thread)-[:HAS_POST]->(p:Post)
        RETURN b.name AS board, count(t) AS threads, count(p) AS posts,
               avg(p.score) AS avg_score, max(p.score) AS top_score,
               sum(CASE WHEN p.deleted THEN 1 ELSE 0 END) AS deleted
    """, slug=slug)
    return rows[0] if rows else {}

@router.post("", status_code=201)
async def create_board(body: BoardCreate):
    rows = await q("""
        CREATE (b:Board {
            id: randomUUID(), name:$name, slug:$slug,
            description:$description, nsfw:$nsfw,
            post_count:0, created_at:date()
        }) RETURN b
    """, **body.dict())
    return dict(rows[0]["b"])

@router.put("/{board_id}")
async def update_board(board_id: str, body: dict):
    sets = ", ".join(f"b.{k} = ${k}" for k in body)
    rows = await q(f"MATCH (b:Board {{id:$id}}) SET {sets} RETURN b",
                   id=board_id, **body)
    if not rows: raise HTTPException(404)
    return dict(rows[0]["b"])

@router.delete("/{board_id}")
async def delete_board(board_id: str):
    await q("MATCH (b:Board {id:$id}) DETACH DELETE b", id=board_id)
    return {"deleted": board_id}
