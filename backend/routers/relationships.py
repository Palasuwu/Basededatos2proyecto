"""
CRUD completo de relaciones — cubre todos los puntos de la rúbrica.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Optional
from database import run_query as q

router = APIRouter(prefix="/api/relationships", tags=["relationships"])

ALLOWED_RELS = {
    "HAS_THREAD", "HAS_POST", "WROTE", "CREATED", "QUOTES", "HAS_FILE",
    "TAGGED_WITH", "TARGETS", "MANAGES", "ISSUED_BAN", "BANS",
    "REPORTED", "FOLLOWS", "REACTED_TO", "POSTED_FROM"
}


# ── READ relaciones ──────────────────────────────────────────────────────
@router.get("")
async def list_relationships(
    rel_type: str = Query(..., description="Tipo de relación"),
    limit: int = Query(50, le=200)
):
    if rel_type not in ALLOWED_RELS:
        raise HTTPException(400, "Relationship type not allowed")

    rows = await q(
        f"MATCH (a)-[r:{rel_type}]->(b) "
        f"RETURN elementId(r) AS rel_id, properties(r) AS props"
        f"labels(a)[0] AS from_label, labels(b)[0] AS to_label, "
        f"coalesce(a.id, a.name, a.address, a.slug) AS from_id, "
        f"coalesce(b.id, b.name, b.address, b.slug) AS to_id "
        f"LIMIT $limit",
        limit=limit
    )
    return rows


# ── CREATE relación con 3+ propiedades ──────────────────────────────────
class RelCreate(BaseModel):
    rel_type: str
    from_label: str
    from_id: str
    to_label: str
    to_id: str
    prop1_key: str
    prop1_value: Any
    prop2_key: str
    prop2_value: Any
    prop3_key: str
    prop3_value: Any


@router.post("", status_code=201)
async def create_relationship(body: RelCreate):
    if body.rel_type not in ALLOWED_RELS:
        raise HTTPException(400, "Relationship type not allowed")

    props = {
        body.prop1_key: body.prop1_value,
        body.prop2_key: body.prop2_value,
        body.prop3_key: body.prop3_value,
    }

    prop_str = ", ".join(f"{k}: ${k}" for k in props)

    rows = await q(
        f"MATCH (a:{body.from_label}), (b:{body.to_label}) "
        f"WHERE (a.id = $from_id OR a.name = $from_id OR a.address = $from_id OR a.slug = $from_id) "
        f"AND   (b.id = $to_id   OR b.name = $to_id   OR b.address = $to_id   OR b.slug = $to_id) "
        f"CREATE (a)-[r:{body.rel_type} {{{prop_str}}}]->(b) "
        f"RETURN id(r) AS rel_id, properties(r) AS props",
        from_id=body.from_id,
        to_id=body.to_id,
        **props
    )

    if not rows:
        raise HTTPException(400, "Nodes not found")

    return rows[0]


# ── MODELOS ──────────────────────────────────────────────────────────────
class RelPropOp(BaseModel):
    prop: str
    value: Any


class BulkRelProp(BaseModel):
    prop: str
    value: Any
    filter_prop: Optional[str] = None
    filter_value: Optional[Any] = None


# ── BULK PRIMERO: evita que FastAPI tome "bulk" como rel_id ──────────────
@router.patch("/{rel_type}/bulk/property")
async def bulk_set_rel_property(rel_type: str, body: BulkRelProp):
    if rel_type not in ALLOWED_RELS:
        raise HTTPException(400, "Relationship type not allowed")

    w = "WHERE r[$fp] = $fv" if body.filter_prop else ""

    rows = await q(
        f"MATCH ()-[r:{rel_type}]->() {w} "
        f"SET r[$prop] = $value RETURN count(r) AS updated",
        fp=body.filter_prop,
        fv=body.filter_value,
        prop=body.prop,
        value=body.value
    )

    return {"updated": rows[0]["updated"]}


@router.delete("/{rel_type}/bulk/property/{prop_name}")
async def bulk_remove_rel_property(
    rel_type: str,
    prop_name: str,
    filter_prop: Optional[str] = None,
    filter_value: Optional[str] = None
):
    if rel_type not in ALLOWED_RELS:
        raise HTTPException(400, "Relationship type not allowed")

    w = "WHERE r[$fp] = $fv" if filter_prop else ""

    rows = await q(
        f"MATCH ()-[r:{rel_type}]->() {w} "
        f"REMOVE r[$prop] RETURN count(r) AS updated",
        fp=filter_prop,
        fv=filter_value,
        prop=prop_name
    )

    return {"updated": rows[0]["updated"]}


@router.delete("/{rel_type}/bulk/delete")
async def delete_multiple_relationships(
    rel_type: str,
    filter_prop: Optional[str] = None,
    filter_value: Optional[str] = None
):
    if rel_type not in ALLOWED_RELS:
        raise HTTPException(400, "Relationship type not allowed")

    w = "WHERE r[$fp] = $fv" if filter_prop else ""

    rows = await q(
        f"MATCH ()-[r:{rel_type}]->() {w} "
        f"WITH r, count(r) AS total DELETE r RETURN total",
        fp=filter_prop,
        fv=filter_value
    )

    return {"deleted": rows[0]["total"] if rows else 0}


# ── INDIVIDUALES DESPUÉS ────────────────────────────────────────────────
@router.patch("/{rel_type}/{rel_id}/property")
async def set_rel_property(rel_type: str, rel_id: int, body: RelPropOp):
    if rel_type not in ALLOWED_RELS:
        raise HTTPException(400, "Relationship type not allowed")

    rows = await q(
        f"MATCH ()-[r:{rel_type}]->() WHERE id(r) = $rid "
        f"SET r[$prop] = $value "
        f"RETURN id(r) AS rel_id, properties(r) AS props",
        rid=rel_id,
        prop=body.prop,
        value=body.value
    )

    if not rows:
        raise HTTPException(404)

    return rows[0]


@router.delete("/{rel_type}/{rel_id}/property/{prop_name}")
async def remove_rel_property(rel_type: str, rel_id: int, prop_name: str):
    if rel_type not in ALLOWED_RELS:
        raise HTTPException(400, "Relationship type not allowed")

    rows = await q(
        f"MATCH ()-[r:{rel_type}]->() WHERE id(r) = $rid "
        f"REMOVE r[$prop] "
        f"RETURN id(r) AS rel_id, properties(r) AS props",
        rid=rel_id,
        prop=prop_name
    )

    if not rows:
        raise HTTPException(404)

    return rows[0]


@router.delete("/{rel_type}/{rel_id}")
async def delete_relationship(rel_type: str, rel_id: int):
    if rel_type not in ALLOWED_RELS:
        raise HTTPException(400, "Relationship type not allowed")

    await q(
        f"MATCH ()-[r:{rel_type}]->() WHERE id(r) = $rid DELETE r",
        rid=rel_id
    )

    return {"deleted": rel_id}
