"""
CRUD completo de nodos — cubre todos los puntos de la rúbrica.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Optional
from database import run_query as q

router = APIRouter(prefix="/api/nodes", tags=["nodes"])

ALLOWED_LABELS = {
    "Board", "Thread", "Post", "User", "IP", "File",
    "Country", "Tag", "Reaction", "Ban"
}


def validate_label(label: str):
    if label not in ALLOWED_LABELS:
        raise HTTPException(400, "Label not allowed")


# ── READ nodos ────────────────────────────────────────────────
@router.get("")
async def list_nodes(
    label: str = Query(..., description="Etiqueta del nodo"),
    limit: int = Query(50, le=200)
):
    validate_label(label)

    rows = await q(
        f"MATCH (n:{label}) "
        f"RETURN properties(n) AS props "
        f"LIMIT $limit",
        limit=limit
    )

    return rows


# ── CREATE nodo con 3+ propiedades ────────────────────────────
class NodeCreate(BaseModel):
    label: str
    prop1_key: str
    prop1_value: Any
    prop2_key: str
    prop2_value: Any
    prop3_key: str
    prop3_value: Any


@router.post("", status_code=201)
async def create_node(body: NodeCreate):
    validate_label(body.label)

    props = {
        body.prop1_key: body.prop1_value,
        body.prop2_key: body.prop2_value,
        body.prop3_key: body.prop3_value,
    }

    prop_str = ", ".join(f"{k}: ${k}" for k in props)

    rows = await q(
        f"CREATE (n:{body.label} {{{prop_str}}}) "
        f"RETURN properties(n) AS props",
        **props
    )

    return rows[0]


# ── MODELOS ───────────────────────────────────────────────────
class BulkPropOp(BaseModel):
    prop: str
    value: Any
    filter_prop: Optional[str] = None
    filter_value: Optional[Any] = None


class PropOp(BaseModel):
    prop: str
    value: Any


# ── BULK PRIMERO ──────────────────────────────────────────────
@router.patch("/{label}/bulk/property")
async def bulk_set_property(label: str, body: BulkPropOp):
    validate_label(label)

    w = "WHERE n[$fp] = $fv" if body.filter_prop else ""

    rows = await q(
        f"MATCH (n:{label}) {w} "
        f"SET n[$prop] = $value "
        f"RETURN count(n) AS updated",
        fp=body.filter_prop,
        fv=body.filter_value,
        prop=body.prop,
        value=body.value
    )

    return {"updated": rows[0]["updated"]}


@router.delete("/{label}/bulk/property/{prop_name}")
async def bulk_remove_property(
    label: str,
    prop_name: str,
    filter_prop: Optional[str] = None,
    filter_value: Optional[str] = None
):
    validate_label(label)

    w = "WHERE n[$fp] = $fv" if filter_prop else ""

    rows = await q(
        f"MATCH (n:{label}) {w} "
        f"REMOVE n[$prop] "
        f"RETURN count(n) AS updated",
        fp=filter_prop,
        fv=filter_value,
        prop=prop_name
    )

    return {"updated": rows[0]["updated"]}


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
        f"WITH n, count(n) AS total "
        f"DETACH DELETE n "
        f"RETURN total",
        fp=filter_prop,
        fv=filter_value
    )

    return {"deleted": rows[0]["total"] if rows else 0}


# ── INDIVIDUALES DESPUÉS ─────────────────────────────────────
@router.patch("/{label}/{node_id}/property")
async def set_property(label: str, node_id: str, body: PropOp):
    validate_label(label)

    rows = await q(
        f"MATCH (n:{label}) "
        f"WHERE n.id = $id OR n.name = $id OR n.address = $id OR n.slug = $id "
        f"SET n[$prop] = $value "
        f"RETURN properties(n) AS props",
        id=node_id,
        prop=body.prop,
        value=body.value
    )

    if not rows:
        raise HTTPException(404)

    return rows[0]


@router.delete("/{label}/{node_id}/property/{prop_name}")
async def remove_property(label: str, node_id: str, prop_name: str):
    validate_label(label)

    rows = await q(
        f"MATCH (n:{label}) "
        f"WHERE n.id = $id OR n.name = $id OR n.address = $id OR n.slug = $id "
        f"REMOVE n[$prop] "
        f"RETURN properties(n) AS props",
        id=node_id,
        prop=prop_name
    )

    if not rows:
        raise HTTPException(404)

    return rows[0]


@router.delete("/{label}/{node_id}")
async def delete_node(label: str, node_id: str):
    validate_label(label)

    await q(
        f"MATCH (n:{label}) "
        f"WHERE n.id = $id OR n.name = $id OR n.address = $id OR n.slug = $id "
        f"DETACH DELETE n",
        id=node_id
    )

    return {"deleted": node_id}
