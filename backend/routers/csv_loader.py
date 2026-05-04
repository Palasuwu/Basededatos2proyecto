"""
Carga de datos desde CSV — cubre:
  • Carga de datos mediante archivo CSV (nodos y relaciones) (5 pts)
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from database import run_query as q
import csv, io, uuid

router = APIRouter(prefix="/api/csv", tags=["csv"])

ALLOWED_LABELS = {"Board","Thread","Post","User","Tag","File","Report","Ban","Reaction","IP"}
ALLOWED_RELS   = {
    "HAS_THREAD","HAS_POST","WROTE","CREATED","QUOTES","HAS_FILE",
    "TAGGED_WITH","TARGETS","MANAGES","ISSUED_BAN","BANS",
    "REPORTED","FOLLOWS","REACTED_TO","POSTED_FROM"
}

# Columnas que se convierten automáticamente según su nombre
BOOL_COLS  = {"nsfw","is_anon","is_op","deleted","flagged","banned","active","locked",
              "resolved","permanent","proxy","notify","is_pinned","is_proxy",
              "appeal_allowed","auto_flagged","anonymous","notified","primary","verified"}
INT_COLS   = {"score","karma","post_count","word_count","reply_count","bump_order",
              "priority","width","height","count","position","order","total_actions"}
FLOAT_COLS = {"size_kb","risk_score","weight","relevance","upvote_ratio"}
LIST_COLS  = {"interests","tags","active_boards","media_urls","permissions_list"}
DATE_COLS  = {"joined_at","created_at","uploaded_at","first_seen","since",
              "starts_at","ends_at","last_seen","added_at","effective_at","at"}


def cast(col: str, val: str):
    """Convierte el valor del CSV al tipo correcto según el nombre de columna."""
    v = val.strip()
    if col in BOOL_COLS:
        return v.lower() in ("true", "1", "yes", "t")
    if col in INT_COLS:
        try: return int(v)
        except: return 0
    if col in FLOAT_COLS:
        try: return float(v)
        except: return 0.0
    if col in LIST_COLS:
        return [x.strip() for x in v.split("|") if x.strip()]
    return v  # string por default


def build_set_clause(props: dict) -> tuple[str, dict]:
    """Genera SET clause y parámetros, usando date() o datetime() según la columna."""
    parts  = []
    params = {}
    for col, val in props.items():
        pk = f"p_{col}"
        if col in DATE_COLS and isinstance(val, str) and val:
            fn = "datetime" if "T" in val else "date"
            parts.append(f"n.{col} = {fn}(${pk})")
        else:
            parts.append(f"n.{col} = ${pk}")
        params[pk] = val
    return ", ".join(parts), params


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/csv/nodes  — carga nodos
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/nodes", summary="Cargar nodos desde CSV")
async def upload_nodes(
    file: UploadFile = File(...),
    node_type: str   = Form(..., description="Label del nodo: Post, User, Board, Thread, Tag, File, Report, Ban, Reaction, IP"),
):
    """
    Carga nodos a Neo4j desde un archivo CSV.

    **Formato del CSV:**
    - Primera fila = encabezados (nombres de propiedades)
    - Columna `id` opcional; si viene vacía se genera un UUID automáticamente
    - Listas se separan con `|` (ej: `tech|news|random`)
    - Booleanos: `true`/`false`, `1`/`0`, `yes`/`no`

    Rúbrica: *Carga de datos mediante CSV — nodos* (5 pts)
    """
    if node_type not in ALLOWED_LABELS:
        raise HTTPException(400, f"node_type debe ser uno de: {sorted(ALLOWED_LABELS)}")

    content = await file.read()
    reader  = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))

    created, errors = 0, []

    for i, row in enumerate(reader, start=2):
        # Asignar UUID si id viene vacío
        if not row.get("id", "").strip():
            row["id"] = str(uuid.uuid4())

        props = {col: cast(col, val) for col, val in row.items() if val is not None}

        set_clause, params = build_set_clause(props)
        if not set_clause:
            continue

        try:
            await q(f"CREATE (n:{node_type}) SET {set_clause}", **params)
            created += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    return {
        "node_type":      node_type,
        "created":        created,
        "errors_count":   len(errors),
        "errors":         errors[:20],
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/csv/relationships  — carga relaciones
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/relationships", summary="Cargar relaciones desde CSV")
async def upload_relationships(
    file: UploadFile = File(...),
    rel_type:    str = Form(..., description="Tipo de relación: WROTE, FOLLOWS, HAS_POST, etc."),
    from_label:  str = Form(..., description="Label del nodo origen: User, Post, Thread..."),
    to_label:    str = Form(..., description="Label del nodo destino"),
    from_id_col: str = Form("from_id", description="Columna CSV con el ID del nodo origen"),
    to_id_col:   str = Form("to_id",   description="Columna CSV con el ID del nodo destino"),
):
    """
    Carga relaciones a Neo4j desde un archivo CSV.

    **Formato del CSV:**
    - Debe tener al menos dos columnas: `from_id` y `to_id` (o las que se indiquen)
    - El resto de columnas se convierten en propiedades de la relación

    Rúbrica: *Carga de datos mediante CSV — relaciones* (5 pts)
    """
    if rel_type not in ALLOWED_RELS:
        raise HTTPException(400, f"rel_type debe ser uno de: {sorted(ALLOWED_RELS)}")

    content = await file.read()
    reader  = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))

    created, errors = 0, []

    for i, row in enumerate(reader, start=2):
        f_id = row.get(from_id_col, "").strip()
        t_id = row.get(to_id_col,   "").strip()
        if not f_id or not t_id:
            errors.append({"row": i, "error": f"'{from_id_col}' o '{to_id_col}' vacío"})
            continue

        # Propiedades de la relación (todo excepto los IDs)
        props = {
            col: cast(col, val)
            for col, val in row.items()
            if col not in (from_id_col, to_id_col) and val is not None
        }

        # Construir SET para relación (con soporte date/datetime)
        set_parts, params = [], {"from_id": f_id, "to_id": t_id}
        for col, val in props.items():
            pk = f"p_{col}"
            params[pk] = val
            if col in DATE_COLS and isinstance(val, str) and val:
                fn = "datetime" if "T" in val else "date"
                set_parts.append(f"r.{col} = {fn}(${pk})")
            else:
                set_parts.append(f"r.{col} = ${pk}")

        set_clause = ("SET " + ", ".join(set_parts)) if set_parts else ""

        try:
            await q(
                f"MATCH (a:{from_label}) "
                f"WHERE a.id = $from_id OR a.address = $from_id OR a.name = $from_id "
                f"MATCH (b:{to_label}) "
                f"WHERE b.id = $to_id OR b.address = $to_id OR b.name = $to_id "
                f"CREATE (a)-[r:{rel_type}]->(b) {set_clause}",
                **params
            )
            created += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    return {
        "rel_type":     rel_type,
        "created":      created,
        "errors_count": len(errors),
        "errors":       errors[:20],
    }
