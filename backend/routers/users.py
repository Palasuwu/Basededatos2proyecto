from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import run_query as q

router = APIRouter(prefix="/api/users", tags=["users"])

async def _q_unused(query, **params):  # replaced
    async with driver.session(database="neo4j") as s:
        r = await s.run(query, **params)
        return await r.data()

class UserCreate(BaseModel):
    alias: str
    is_anon: bool = False

class ModCreate(BaseModel):
    alias: str
    level: str = "junior"
    active_boards: List[str] = []

@router.get("")
async def list_users(
    alias: Optional[str] = None,
    min_karma: Optional[int] = None,
    is_anon: Optional[bool] = None,
    limit: int = Query(50, le=200)
):
    filters = []
    if alias: filters.append("u.alias CONTAINS $alias")
    if min_karma is not None: filters.append("u.karma >= $min_karma")
    if is_anon is not None: filters.append("u.is_anon = $is_anon")
    w = "WHERE " + " AND ".join(filters) if filters else ""
    rows = await q(f"MATCH (u:User) {w} RETURN u ORDER BY u.karma DESC LIMIT $limit",
                   alias=alias, min_karma=min_karma, is_anon=is_anon, limit=limit)
    return [dict(r["u"]) for r in rows]

@router.get("/moderators")
async def list_moderators():
    rows = await q("MATCH (m:User:Moderator) RETURN m ORDER BY m.since DESC")
    return [dict(r["m"]) for r in rows]

@router.get("/{user_id}")
async def get_user(user_id: str):
    rows = await q("MATCH (u:User {id:$id}) RETURN u", id=user_id)
    if not rows: raise HTTPException(404)
    return dict(rows[0]["u"])

# ── CREATE: 1 label (User) ──────────────────────────────────────────────
@router.post("", status_code=201)
async def create_user(body: UserCreate):
    rows = await q("""
        CREATE (u:User {
            id:randomUUID(), alias:$alias, is_anon:$is_anon,
            ip_hash:randomUUID(), joined_at:date(), post_count:0,
            karma:0, banned:false, interests:[]
        }) RETURN u
    """, **body.dict())
    return dict(rows[0]["u"])

# ── CREATE: 2 labels (User + Moderator) ────────────────────────────────
@router.post("/moderators", status_code=201)
async def create_moderator(body: ModCreate):
    rows = await q("""
        MERGE (m:User:Moderator {alias:$alias})
        ON CREATE SET
            m.id           = randomUUID(),
            m.is_anon      = false,
            m.ip_hash      = randomUUID(),
            m.joined_at    = date(),
            m.post_count   = 0,
            m.karma        = 0,
            m.banned       = false,
            m.interests    = [],
            m.level        = $level,
            m.since        = date(),
            m.active_boards = $active_boards,
            m.active       = true
        RETURN m
    """, **body.dict())
    return dict(rows[0]["m"])

@router.patch("/{user_id}/karma")
async def update_karma(user_id: str, delta: int = 1):
    rows = await q("MATCH (u:User {id:$id}) SET u.karma = u.karma + $d RETURN u",
                   id=user_id, d=delta)
    return dict(rows[0]["u"])

@router.delete("/{user_id}")
async def delete_user(user_id: str):
    await q("MATCH (u:User {id:$id}) DETACH DELETE u", id=user_id)
    return {"deleted": user_id}
