"""
Operaciones genéricas sobre nodos — cubre todos los puntos de la rúbrica
relacionados con gestión de propiedades y eliminación.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Optional
from database import run_query as q

router = APIRouter(prefix="/api/nodes", tags=["nodes"])

ALLOWED_LABELS = {"Board","Thread","Post","User","Tag","File","Report","Ban","Reaction","IP","Moderator"}

async def _q_unused(query, **params):  # replaced
    async with driver.session(database="neo4j") as s:
        r = await s.run(query, **params)
        return await r.data()

def validate_label(label: str):
    if label not in ALLOWED_LABELS:
        raise HTTPException(400, f"Label '{label}' not allowed")

# ── READ: múltiples nodos con filtro ───────────────────────────────────
@router.get("/{label}")
async def list_nodes(
    label: str,
    prop: Optional[str] = None,
    value: Optional[str] = None,
    limit: int = Query(50, le=500)
):
    validate_label(label)
    w = "WHERE toString(n[$prop]) CONTAINS $value" if (prop and value) else ""
    rows = await q(f"MATCH (n:{label}) {w} RETURN n LIMIT $limit",
                   prop=prop, value=value, limit=limit)
    return [dict(r["n"]) for r in rows]

# ── READ: 1 nodo ────────────────────────────────────────────────────────
@router.get("/{label}/{node_id}")
async def get_node(label: str, node_id: str):
    validate_label(label)
    rows = await q(f"MATCH (n:{label}) WHERE n.id = $id OR n.address = $id RETURN n",
                   id=node_id)
    if not rows: raise HTTPException(404)
    return dict(rows[0]["n"])

# ── ADD / UPDATE propiedad en 1 nodo ────────────────────────────────────
class PropOp(BaseModel):
    prop: str
    value: Any

@router.patch("/{label}/{node_id}/property")
async def set_property(label: str, node_id: str, body: PropOp):
    validate_label(label)
    rows = await q(
        f"MATCH (n:{label}) WHERE n.id = $id OR n.address = $id "
        f"SET n[$prop] = $value RETURN n",
        id=node_id, prop=body.prop, value=body.value
    )
    if not rows: raise HTTPException(404)
    return dict(rows[0]["n"])

# ── DELETE propiedad en 1 nodo ──────────────────────────────────────────
@router.delete("/{label}/{node_id}/property/{prop_name}")
async def remove_property(label: str, node_id: str, prop_name: str):
    validate_label(label)
    rows = await q(
        f"MATCH (n:{label}) WHERE n.id = $id OR n.address = $id "
        f"REMOVE n[$prop] RETURN n",
        id=node_id, prop=prop_name
    )
    if not rows: raise HTTPException(404)
    return dict(rows[0]["n"])

# ── UPDATE propiedad en MÚLTIPLES nodos ─────────────────────────────────
class BulkPropOp(BaseModel):
    prop: str
    value: Any
    filter_prop: Optional[str] = None
    filter_value: Optional[Any] = None

@router.patch("/{label}/bulk/property")
async def bulk_set_property(label: str, body: BulkPropOp):
    validate_label(label)
    w = "WHERE n[$fp] = $fv" if body.filter_prop else ""
    rows = await q(
        f"MATCH (n:{label}) {w} SET n[$prop] = $value RETURN count(n) AS updated",
        fp=body.filter_prop, fv=body.filter_value,
        prop=body.prop, value=body.value
    )
    return {"updated": rows[0]["updated"]}

# ── DELETE propiedad en MÚLTIPLES nodos ─────────────────────────────────
@router.delete("/{label}/bulk/property/{prop_name}")
async def bulk_remove_property(
    label: str, prop_name: str,
    filter_prop: Optional[str] = None,
    filter_value: Optional[str] = None
):
    validate_label(label)
    w = "WHERE n[$fp] = $fv" if filter_prop else ""
    rows = await q(
        f"MATCH (n:{label}) {w} REMOVE n[$prop] RETURN count(n) AS updated",
        fp=filter_prop, fv=filter_value, prop=prop_name
    )
    return {"updated": rows[0]["updated"]}

# ── DELETE 1 nodo ────────────────────────────────────────────────────────
@router.delete("/{label}/{node_id}")
async def delete_node(label: str, node_id: str):
    validate_label(label)
    await q(f"MATCH (n:{label}) WHERE n.id = $id OR n.address = $id DETACH DELETE n",
            id=node_id)
    return {"deleted": node_id}

# ── DELETE múltiples nodos ───────────────────────────────────────────────
@router.delete("/{label}/bulk/delete")
async def delete_multiple_nodes(
    label: str,
    filter_prop: Optional[str] = None,
    filter_value: Optional[str] = None
):
    validate_label(label)
    w = "WHERE n[$fp] = $fv" if filter_prop else ""
    rows = await q(
        f"MATCH (n:{label}) {w} "
        f"WITH n, count(n) AS total DETACH DELETE n RETURN total",
        fp=filter_prop, fv=filter_value
    )
    return {"deleted": rows[0]["total"] if rows else 0}
