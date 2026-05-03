#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ChanDB — Menú Terminal
Conexión directa a Neo4j, sin API.
Cubre todos los puntos de la rúbrica CC3089.
"""

import os, sys
from neo4j import GraphDatabase

# ── Conexión ──────────────────────────────────────────────────────────────
URI      = "bolt://localhost:7687"
USER     = "neo4j"
PASSWORD = "pala1234"

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

def q(query, **params):
    with driver.session(database="neo4j") as s:
        return s.run(query, **params).data()

# ── Colores ANSI ──────────────────────────────────────────────────────────
G  = "\033[92m"   # verde
B  = "\033[94m"   # azul
Y  = "\033[93m"   # amarillo
R  = "\033[91m"   # rojo
C  = "\033[96m"   # cyan
BD = "\033[1m"    # bold
DM = "\033[2m"    # dim
RS = "\033[0m"    # reset

LABELS = ["Board", "User", "Thread", "Post", "Tag", "IP", "Report", "Ban", "Reaction", "File"]
RELS   = ["FOLLOWS", "MANAGES", "WROTE", "HAS_THREAD", "HAS_POST", "QUOTES",
          "TAGGED_WITH", "TARGETS", "POSTED_FROM", "REACTED_TO", "BANS", "REPORTED"]

# ── Utilidades ────────────────────────────────────────────────────────────
def cls():
    os.system("cls" if os.name == "nt" else "clear")

def cab(titulo):
    cls()
    linea = "═" * 56
    print(f"\n{G}{BD}{linea}{RS}")
    print(f"{G}{BD}  /chan/db — {titulo}{RS}")
    print(f"{G}{BD}{linea}{RS}\n")

def ok(msg):   print(f"\n{G}✓ {msg}{RS}")
def err(msg):  print(f"\n{R}✗ {msg}{RS}")
def info(msg): print(f"  {C}→ {msg}{RS}")

def pausa():
    input(f"\n{DM}  Presiona Enter para continuar...{RS}")

def pedir(prompt, default=None):
    sufijo = f" [{default}]" if default else ""
    val = input(f"  {prompt}{sufijo}: ").strip()
    return val if val else (default or "")

def castear(val):
    try:    return int(val)
    except:
        try:    return float(val)
        except: return val

def tabla(rows, cols=None):
    if not rows:
        print(f"  {DM}(sin resultados){RS}"); return
    if cols is None:
        cols = list(rows[0].keys())
    ancho = {k: max(len(str(k)), max(len(str(r.get(k, ""))) for r in rows)) for k in cols}
    ancho = {k: min(v, 38) for k, v in ancho.items()}

    cab_fila = "  " + "  │  ".join(f"{BD}{C}{k:<{ancho[k]}}{RS}" for k in cols)
    sep      = "  " + "──┼──".join("─" * ancho[k] for k in cols)
    print(cab_fila); print(sep)
    for r in rows:
        celdas = []
        for k in cols:
            v = str(r.get(k, ""))
            if len(v) > ancho[k]: v = v[:ancho[k]-2] + ".."
            celdas.append(f"{v:<{ancho[k]}}")
        print("  " + "  │  ".join(celdas))
    print(f"\n  {DM}{len(rows)} resultado(s){RS}")

def menu_label():
    for i, l in enumerate(LABELS, 1):
        print(f"  {G}[{i}]{RS} {l}")
    idx = pedir("Label (número)")
    try:    return LABELS[int(idx) - 1]
    except: err("Opción inválida"); return None

def menu_rel_tipo():
    for i, t in enumerate(RELS, 1):
        print(f"  {G}[{i}]{RS} {t}")
    idx = pedir("Tipo (número)")
    try:    return RELS[int(idx) - 1]
    except: err("Opción inválida"); return None

# ══════════════════════════════════════════════════════════════════════════
# MENÚ PRINCIPAL
# ══════════════════════════════════════════════════════════════════════════
def principal():
    while True:
        cab("Menú Principal")
        print(f"  {G}[1]{RS} CRUD de Nodos")
        print(f"  {G}[2]{RS} CRUD de Relaciones")
        print(f"  {B}[3]{RS} Propiedades de Nodos")
        print(f"  {B}[4]{RS} Propiedades de Relaciones")
        print(f"  {C}[5]{RS} Consultas de Análisis")
        print(f"  {Y}[6]{RS} Estadísticas del Grafo")
        print(f"  {R}[0]{RS} Salir")

        op = pedir("\n  Opción")
        if   op == "1": menu_nodos()
        elif op == "2": menu_relaciones()
        elif op == "3": menu_props_nodos()
        elif op == "4": menu_props_rels()
        elif op == "5": menu_analytics()
        elif op == "6": estadisticas()
        elif op == "0":
            print(f"\n{G}  Hasta luego!{RS}\n")
            driver.close(); sys.exit(0)

# ══════════════════════════════════════════════════════════════════════════
# CRUD DE NODOS
# ══════════════════════════════════════════════════════════════════════════
def menu_nodos():
    while True:
        cab("CRUD de Nodos")
        print(f"  {G}[1]{RS} Crear nodo (1 label)")
        print(f"  {G}[2]{RS} Crear nodo con 2 labels  {DM}(ej: User:Moderator){RS}")
        print(f"  {G}[3]{RS} Buscar nodo por ID")
        print(f"  {G}[4]{RS} Listar nodos por label")
        print(f"  {B}[5]{RS} Actualizar propiedad de nodo")
        print(f"  {R}[6]{RS} Eliminar un nodo")
        print(f"  {R}[7]{RS} Eliminar múltiples nodos  {DM}(bulk){RS}")
        print(f"  {DM}[0]{RS} Volver")

        op = pedir("\n  Opción")
        if   op == "1": crear_nodo()
        elif op == "2": crear_nodo_dos_labels()
        elif op == "3": buscar_nodo()
        elif op == "4": listar_nodos()
        elif op == "5": actualizar_nodo()
        elif op == "6": eliminar_nodo()
        elif op == "7": eliminar_bulk_nodos()
        elif op == "0": return

def crear_nodo():
    cab("Crear Nodo — 1 Label")
    label = menu_label()
    if not label: pausa(); return

    print(f"\n  {C}Creando nodo: {BD}{label}{RS}\n")

    if label == "Board":
        name = pedir("Nombre del board")
        slug = pedir("Slug (ej: tech)")
        desc = pedir("Descripción")
        nsfw = pedir("¿NSFW? (s/n)", "n").lower() == "s"
        rows = q("""
            CREATE (n:Board {
                id: randomUUID(), name: $name, slug: $slug,
                description: $desc, nsfw: $nsfw,
                post_count: 0, created_at: date()
            }) RETURN n.id AS id, n.name AS name, n.slug AS slug
        """, name=name, slug=slug, desc=desc, nsfw=nsfw)

    elif label == "User":
        alias = pedir("Alias")
        email = pedir("Email")
        role  = pedir("Rol (user/mod/admin)", "user")
        rows  = q("""
            CREATE (n:User {
                id: randomUUID(), alias: $alias, email: $email,
                role: $role, karma: 0, post_count: 0,
                banned: false, created_at: datetime()
            }) RETURN n.id AS id, n.alias AS alias, n.email AS email
        """, alias=alias, email=email, role=role)

    elif label == "Thread":
        title = pedir("Título del thread")
        sample = q("MATCH (b:Board) RETURN b.id AS id, b.name AS name LIMIT 8")
        print(); tabla(sample, ["id", "name"])
        bid = pedir("ID del board")
        rows = q("""
            MATCH (b:Board {id: $bid})
            CREATE (n:Thread {
                id: randomUUID(), title: $title,
                post_count: 0, pinned: false, created_at: datetime()
            })
            CREATE (b)-[:HAS_THREAD]->(n)
            RETURN n.id AS id, n.title AS title
        """, bid=bid, title=title)

    elif label == "Post":
        content = pedir("Contenido")
        us = q("MATCH (u:User) RETURN u.id AS id, u.alias AS alias LIMIT 8")
        print(); tabla(us, ["id", "alias"])
        uid = pedir("ID del usuario")
        th = q("MATCH (t:Thread) RETURN t.id AS id, t.title AS title LIMIT 8")
        print(); tabla(th, ["id", "title"])
        tid = pedir("ID del thread")
        rows = q("""
            MATCH (u:User {id: $uid}), (t:Thread {id: $tid})
            CREATE (n:Post {
                id: randomUUID(), content: $content,
                score: 0, deleted: false, created_at: datetime()
            })
            CREATE (u)-[:WROTE]->(n)
            CREATE (t)-[:HAS_POST]->(n)
            RETURN n.id AS id, left(n.content, 50) AS content
        """, uid=uid, tid=tid, content=content)

    else:
        # Genérico
        prop_key = pedir(f"Propiedad principal de {label}", "name")
        prop_val = pedir(f"Valor de '{prop_key}'")
        rows = q(f"""
            CREATE (n:{label} {{id: randomUUID(), {prop_key}: $val, created_at: datetime()}})
            RETURN n.id AS id
        """, val=prop_val)

    if rows: ok(f"Nodo {label} creado"); tabla(rows)
    else:    err("No se pudo crear")
    pausa()

def crear_nodo_dos_labels():
    cab("Crear Nodo — 2 Labels (User:Moderator)")
    info("Crea un User con label adicional Moderator y lo asigna a un board")
    print()
    alias = pedir("Alias del moderador")
    email = pedir("Email")
    sample = q("MATCH (b:Board) RETURN b.id AS id, b.name AS name LIMIT 8")
    tabla(sample, ["id", "name"])
    bid = pedir("ID del board a moderar")

    rows = q("""
        MATCH (b:Board {id: $bid})
        CREATE (n:User:Moderator {
            id: randomUUID(), alias: $alias, email: $email,
            role: 'mod', karma: 0, post_count: 0,
            banned: false, created_at: datetime()
        })
        CREATE (n)-[:MANAGES {since: date(), level: 'junior'}]->(b)
        RETURN n.id AS id, n.alias AS alias, labels(n) AS labels
    """, bid=bid, alias=alias, email=email)

    if rows: ok("Nodo User:Moderator creado"); tabla(rows)
    else:    err("Board no encontrado")
    pausa()

def buscar_nodo():
    cab("Buscar Nodo por ID")
    nid = pedir("ID del nodo")
    rows = q("MATCH (n {id: $id}) RETURN labels(n) AS labels, properties(n) AS props", id=nid)
    if not rows: err(f"No existe nodo con ID: {nid}"); pausa(); return

    label = ", ".join(rows[0]["labels"])
    props = rows[0]["props"]
    print(f"\n  {BD}Label:{RS} {G}{label}{RS}")
    for k, v in props.items():
        print(f"  {C}{k}:{RS} {v}")
    pausa()

def listar_nodos():
    cab("Listar Nodos por Label")
    label = menu_label()
    if not label: pausa(); return
    lim = int(pedir("Límite", "20") or "20")

    rows = q(f"MATCH (n:{label}) RETURN n LIMIT $lim", lim=lim)
    if not rows: print(f"  {DM}Sin nodos de tipo {label}{RS}"); pausa(); return

    flat = []
    for r in rows:
        d = dict(r["n"])
        flat.append({k: str(v)[:35] for k, v in d.items()})
    cols = list(flat[0].keys())[:5]
    tabla(flat, cols)
    pausa()

def actualizar_nodo():
    cab("Actualizar Propiedad de Nodo")
    nid = pedir("ID del nodo")
    rows = q("MATCH (n {id: $id}) RETURN labels(n)[0] AS label, properties(n) AS props", id=nid)
    if not rows: err("Nodo no encontrado"); pausa(); return

    print(f"\n  {BD}Label:{RS} {G}{rows[0]['label']}{RS}")
    for k, v in rows[0]["props"].items():
        print(f"  {C}{k}:{RS} {v}")

    key = pedir("\n  Propiedad a modificar")
    val = castear(pedir(f"  Nuevo valor"))
    q(f"MATCH (n {{id: $id}}) SET n[$k] = $val", id=nid, k=key, val=val)
    ok(f"'{key}' actualizado a '{val}'")
    pausa()

def eliminar_nodo():
    cab("Eliminar Nodo")
    nid = pedir("ID del nodo")
    rows = q("MATCH (n {id: $id}) RETURN labels(n)[0] AS label", id=nid)
    if not rows: err("Nodo no encontrado"); pausa(); return

    print(f"\n  {Y}⚠  Eliminar {rows[0]['label']} — {nid}{RS}")
    if pedir("¿Confirmar? (si/no)", "no").lower() != "si":
        info("Cancelado"); pausa(); return

    q("MATCH (n {id: $id}) DETACH DELETE n", id=nid)
    ok(f"Nodo eliminado (DETACH DELETE)")
    pausa()

def eliminar_bulk_nodos():
    cab("Eliminar Múltiples Nodos — Bulk")
    label = menu_label()
    if not label: pausa(); return

    total = q(f"MATCH (n:{label}) RETURN count(n) AS c")[0]["c"]
    print(f"\n  {Y}⚠  Esto eliminará {BD}{total}{RS}{Y} nodos de tipo {label} y todas sus relaciones{RS}")
    confirmacion = pedir(f"Escribe '{label}' para confirmar")
    if confirmacion != label:
        info("Cancelado — texto no coincide"); pausa(); return

    q(f"MATCH (n:{label}) DETACH DELETE n")
    ok(f"{total} nodos {label} eliminados")
    pausa()

# ══════════════════════════════════════════════════════════════════════════
# CRUD DE RELACIONES
# ══════════════════════════════════════════════════════════════════════════
def menu_relaciones():
    while True:
        cab("CRUD de Relaciones")
        print(f"  {G}[1]{RS} Crear relación  {DM}(con 3 propiedades){RS}")
        print(f"  {G}[2]{RS} Listar relaciones por tipo")
        print(f"  {G}[3]{RS} Ver relaciones de un nodo")
        print(f"  {B}[4]{RS} Actualizar propiedad de relación")
        print(f"  {B}[5]{RS} Eliminar propiedad de relación")
        print(f"  {R}[6]{RS} Eliminar una relación")
        print(f"  {R}[7]{RS} Eliminar múltiples relaciones  {DM}(bulk){RS}")
        print(f"  {DM}[0]{RS} Volver")

        op = pedir("\n  Opción")
        if   op == "1": crear_relacion()
        elif op == "2": listar_relaciones()
        elif op == "3": rels_de_nodo()
        elif op == "4": actualizar_rel()
        elif op == "5": remove_prop_rel()
        elif op == "6": eliminar_rel()
        elif op == "7": eliminar_bulk_rels()
        elif op == "0": return

def crear_relacion():
    cab("Crear Relación — con 3 Propiedades")
    tipo = menu_rel_tipo()
    if not tipo: pausa(); return

    from_id = pedir("ID nodo origen")
    to_id   = pedir("ID nodo destino")

    print(f"\n  {C}Define 3 propiedades para la relación:{RS}")
    p1k = pedir("  Prop 1 — nombre", "since")
    p1v = castear(pedir(f"  Prop 1 — valor  ({p1k})"))
    p2k = pedir("  Prop 2 — nombre", "weight")
    p2v = castear(pedir(f"  Prop 2 — valor  ({p2k})"))
    p3k = pedir("  Prop 3 — nombre", "active")
    p3v = castear(pedir(f"  Prop 3 — valor  ({p3k})"))

    rows = q(f"""
        MATCH (a {{id: $fid}}), (b {{id: $tid}})
        CREATE (a)-[r:{tipo} {{
            {p1k}: $p1v,
            {p2k}: $p2v,
            {p3k}: $p3v
        }}]->(b)
        RETURN labels(a)[0] AS origen, labels(b)[0] AS destino,
               type(r) AS tipo, properties(r) AS props
    """, fid=from_id, tid=to_id, p1v=p1v, p2v=p2v, p3v=p3v)

    if rows:
        ok(f"Relación {tipo} creada con 3 propiedades")
        r = rows[0]
        print(f"  {r['origen']} ──[{G}{r['tipo']}{RS}]──▶ {r['destino']}")
        print(f"  Props: {r['props']}")
    else:
        err("No se encontraron los nodos — verifica los IDs")
    pausa()

def listar_relaciones():
    cab("Listar Relaciones por Tipo")
    tipo = menu_rel_tipo()
    if not tipo: pausa(); return
    lim = int(pedir("Límite", "15") or "15")

    rows = q(f"""
        MATCH (a)-[r:{tipo}]->(b)
        RETURN labels(a)[0] AS origen, coalesce(a.id, a.name, a.address) AS a_id,
               labels(b)[0] AS destino, coalesce(b.id, b.name, b.address) AS b_id,
               properties(r) AS props
        LIMIT $lim
    """, lim=lim)

    flat = [{
        "origen":  r["origen"],
        "a_id":    str(r["a_id"] or "")[:14],
        "destino": r["destino"],
        "b_id":    str(r["b_id"] or "")[:14],
        "props":   str(r["props"])[:30],
    } for r in rows]
    tabla(flat)
    pausa()

def rels_de_nodo():
    cab("Relaciones de un Nodo")
    nid = pedir("ID del nodo")
    rows = q("""
        MATCH (n {id: $id})-[r]-(m)
        RETURN type(r) AS tipo,
               labels(n)[0] AS desde, labels(m)[0] AS hacia,
               coalesce(m.id, m.name, m.address) AS m_id,
               properties(r) AS props
        LIMIT 20
    """, id=nid)
    tabla(rows, ["tipo", "desde", "hacia", "m_id"])
    pausa()

def actualizar_rel():
    cab("Actualizar Propiedad de Relación")
    from_id = pedir("ID nodo origen")
    to_id   = pedir("ID nodo destino")

    rows = q("""
        MATCH (a {id: $fid})-[r]->(b {id: $tid})
        RETURN id(r) AS rid, type(r) AS tipo, properties(r) AS props LIMIT 1
    """, fid=from_id, tid=to_id)
    if not rows: err("No hay relación entre esos nodos"); pausa(); return

    tipo  = rows[0]["tipo"]
    rid   = rows[0]["rid"]
    props = rows[0]["props"]
    print(f"\n  {BD}Relación:{RS} {G}{tipo}{RS}  {DM}(id interno: {rid}){RS}")
    for k, v in props.items():
        print(f"  {C}{k}:{RS} {v}")

    key = pedir("\n  Propiedad a modificar")
    val = castear(pedir("  Nuevo valor"))
    q(f"MATCH ()-[r:{tipo}]->() WHERE id(r) = $rid SET r[$k] = $val", rid=rid, k=key, val=val)
    ok(f"'{key}' = '{val}' guardado en la relación")
    pausa()

def remove_prop_rel():
    cab("Eliminar Propiedad de Relación")
    from_id = pedir("ID nodo origen")
    to_id   = pedir("ID nodo destino")

    rows = q("""
        MATCH (a {id: $fid})-[r]->(b {id: $tid})
        RETURN id(r) AS rid, type(r) AS tipo, properties(r) AS props LIMIT 1
    """, fid=from_id, tid=to_id)
    if not rows: err("No hay relación entre esos nodos"); pausa(); return

    tipo  = rows[0]["tipo"]
    rid   = rows[0]["rid"]
    props = rows[0]["props"]
    print(f"\n  {BD}Relación:{RS} {G}{tipo}{RS}")
    for k, v in props.items():
        print(f"  {C}{k}:{RS} {v}")

    key = pedir("\n  Propiedad a eliminar")
    if key not in props: err(f"La propiedad '{key}' no existe"); pausa(); return

    q(f"MATCH ()-[r:{tipo}]->() WHERE id(r) = $rid REMOVE r[$k]", rid=rid, k=key)
    ok(f"Propiedad '{key}' eliminada de la relación")
    pausa()

def eliminar_rel():
    cab("Eliminar Relación")
    from_id = pedir("ID nodo origen")
    to_id   = pedir("ID nodo destino")

    rows = q("""
        MATCH (a {id: $fid})-[r]->(b {id: $tid})
        RETURN id(r) AS rid, type(r) AS tipo LIMIT 1
    """, fid=from_id, tid=to_id)
    if not rows: err("No hay relación entre esos nodos"); pausa(); return

    tipo = rows[0]["tipo"]
    rid  = rows[0]["rid"]
    print(f"\n  {Y}⚠  Eliminar {tipo} entre {from_id[:10]}... y {to_id[:10]}...{RS}")
    if pedir("¿Confirmar? (si/no)", "no").lower() != "si":
        info("Cancelado"); pausa(); return

    q(f"MATCH ()-[r:{tipo}]->() WHERE id(r) = $rid DELETE r", rid=rid)
    ok("Relación eliminada")
    pausa()

def eliminar_bulk_rels():
    cab("Eliminar Múltiples Relaciones — Bulk")
    tipo = menu_rel_tipo()
    if not tipo: pausa(); return

    total = q(f"MATCH ()-[r:{tipo}]->() RETURN count(r) AS c")[0]["c"]
    print(f"\n  {Y}⚠  Esto eliminará {BD}{total}{RS}{Y} relaciones de tipo {tipo}{RS}")
    confirmacion = pedir(f"Escribe '{tipo}' para confirmar")
    if confirmacion != tipo:
        info("Cancelado — texto no coincide"); pausa(); return

    q(f"MATCH ()-[r:{tipo}]->() DELETE r")
    ok(f"{total} relaciones {tipo} eliminadas")
    pausa()

# ══════════════════════════════════════════════════════════════════════════
# PROPIEDADES DE NODOS
# ══════════════════════════════════════════════════════════════════════════
def menu_props_nodos():
    while True:
        cab("Propiedades de Nodos")
        print(f"  {G}[1]{RS} SET  — propiedad en un nodo")
        print(f"  {G}[2]{RS} SET  — propiedad en múltiples nodos  {DM}(bulk){RS}")
        print(f"  {R}[3]{RS} REMOVE — propiedad de un nodo")
        print(f"  {DM}[0]{RS} Volver")

        op = pedir("\n  Opción")
        if   op == "1": set_prop_nodo()
        elif op == "2": set_prop_bulk()
        elif op == "3": remove_prop_nodo()
        elif op == "0": return

def set_prop_nodo():
    cab("SET — Propiedad en un Nodo")
    nid = pedir("ID del nodo")
    key = pedir("Nombre de la propiedad")
    val = castear(pedir("Valor"))

    rows = q("MATCH (n {id: $id}) SET n[$k] = $val RETURN n.id AS id", id=nid, k=key, val=val)
    if rows: ok(f"'{key}' = '{val}' guardado en {nid[:14]}...")
    else:    err("Nodo no encontrado")
    pausa()

def set_prop_bulk():
    cab("SET — Propiedad en Múltiples Nodos (Bulk)")
    label = menu_label()
    if not label: pausa(); return

    key = pedir("Nombre de la propiedad")
    val = castear(pedir("Valor a asignar a todos"))

    total = q(f"MATCH (n:{label}) RETURN count(n) AS c")[0]["c"]
    print(f"\n  {Y}Esto afectará {BD}{total}{RS}{Y} nodos de tipo {label}{RS}")
    if pedir("¿Confirmar? (si/no)", "no").lower() != "si":
        info("Cancelado"); pausa(); return

    q(f"MATCH (n:{label}) SET n[$k] = $val", k=key, val=val)
    ok(f"'{key}' = '{val}' asignado a {total} nodos {label}")
    pausa()

def remove_prop_nodo():
    cab("REMOVE — Propiedad de un Nodo")
    nid = pedir("ID del nodo")
    rows = q("MATCH (n {id: $id}) RETURN properties(n) AS props", id=nid)
    if not rows: err("Nodo no encontrado"); pausa(); return

    props = rows[0]["props"]
    print(f"\n  Propiedades actuales:")
    for k, v in props.items():
        print(f"  {C}{k}:{RS} {v}")

    key = pedir("\n  Propiedad a eliminar")
    if key not in props: err(f"La propiedad '{key}' no existe"); pausa(); return

    q("MATCH (n {id: $id}) REMOVE n[$k]", id=nid, k=key)
    ok(f"Propiedad '{key}' eliminada del nodo")
    pausa()

# ══════════════════════════════════════════════════════════════════════════
# PROPIEDADES DE RELACIONES
# ══════════════════════════════════════════════════════════════════════════
def menu_props_rels():
    while True:
        cab("Propiedades de Relaciones")
        print(f"  {G}[1]{RS} SET  — propiedad en una relación")
        print(f"  {R}[2]{RS} REMOVE — propiedad de una relación")
        print(f"  {DM}[0]{RS} Volver")

        op = pedir("\n  Opción")
        if   op == "1": set_prop_rel()
        elif op == "2": remove_prop_rel()
        elif op == "0": return

def set_prop_rel():
    cab("SET — Propiedad en una Relación")
    from_id = pedir("ID nodo origen")
    to_id   = pedir("ID nodo destino")

    rows = q("""
        MATCH (a {id: $fid})-[r]->(b {id: $tid})
        RETURN id(r) AS rid, type(r) AS tipo, properties(r) AS props LIMIT 1
    """, fid=from_id, tid=to_id)
    if not rows: err("No hay relación entre esos nodos"); pausa(); return

    tipo  = rows[0]["tipo"]
    rid   = rows[0]["rid"]
    props = rows[0]["props"]
    print(f"\n  {BD}Relación:{RS} {G}{tipo}{RS}")
    for k, v in props.items():
        print(f"  {C}{k}:{RS} {v}")

    key = pedir("\n  Nombre de la propiedad (nueva o existente)")
    val = castear(pedir("  Valor"))
    q(f"MATCH ()-[r:{tipo}]->() WHERE id(r) = $rid SET r[$k] = $val", rid=rid, k=key, val=val)
    ok(f"'{key}' = '{val}' guardado en la relación {tipo}")
    pausa()

# ══════════════════════════════════════════════════════════════════════════
# ANALYTICS — CONSULTAS DE PRESENTACIÓN
# ══════════════════════════════════════════════════════════════════════════
def menu_analytics():
    while True:
        cab("Consultas de Análisis")
        print(f"  {C}[1]{RS} Q1 — IPs sospechosas  {DM}(brigading / spam){RS}")
        print(f"  {C}[2]{RS} Q2 — Threads más activos")
        print(f"  {C}[3]{RS} Q3 — Cadenas de citas más largas")
        print(f"  {C}[4]{RS} Q4 — Usuarios más influyentes")
        print(f"  {C}[5]{RS} Q5 — Boards sin moderador")
        print(f"  {C}[6]{RS} Q6 — Distribución de reportes por board")
        print(f"  {C}[7]{RS} Q7 — Estadísticas por board")
        print(f"  {Y}[8]{RS} Q8 — PageRank de posts  {DM}(requiere GDS){RS}")
        print(f"  {DM}[0]{RS} Volver")

        op = pedir("\n  Opción")
        if   op == "1": q1_ips()
        elif op == "2": q2_threads()
        elif op == "3": q3_chains()
        elif op == "4": q4_usuarios()
        elif op == "5": q5_boards()
        elif op == "6": q6_reportes()
        elif op == "7": q7_stats()
        elif op == "8": q8_pagerank()
        elif op == "0": return

def q1_ips():
    cab("Q1 — IPs Sospechosas")
    info("IPs que publicaron en más de 2 boards distintos → posible brigading\n")
    rows = q("""
        MATCH (ip:IP)<-[:POSTED_FROM]-(p:Post)<-[:HAS_POST]-(:Thread)<-[:HAS_THREAD]-(b:Board)
        WITH ip, collect(DISTINCT b.slug) AS boards_hit, count(p) AS total_posts
        WHERE size(boards_hit) > 2
        RETURN ip.address AS ip, ip.country AS pais,
               size(boards_hit) AS boards_afectados,
               total_posts,
               round(ip.risk_score * 100, 1) AS riesgo_pct
        ORDER BY total_posts DESC LIMIT 15
    """)
    tabla(rows, ["ip", "pais", "boards_afectados", "total_posts", "riesgo_pct"])
    if rows:
        print(f"\n  {Y}Conclusión:{RS} {len(rows)} IPs con actividad sospechosa entre múltiples boards.")
        print(f"  Las de mayor riesgo_pct son candidatas a ban.")
    pausa()

def q2_threads():
    cab("Q2 — Threads Más Activos")
    info("Threads con más posts en el último año\n")
    rows = q("""
        MATCH (b:Board)-[:HAS_THREAD]->(t:Thread)-[:HAS_POST]->(p:Post)
        WHERE p.created_at >= datetime() - duration('P365D')
        WITH b, t, count(p) AS posts_recientes, max(p.created_at) AS ultimo
        ORDER BY posts_recientes DESC
        RETURN b.name AS board, t.title AS thread,
               posts_recientes, toString(ultimo) AS ultima_actividad
        LIMIT 15
    """)
    tabla(rows, ["board", "thread", "posts_recientes", "ultima_actividad"])
    pausa()

def q3_chains():
    cab("Q3 — Cadenas de Citas Más Largas")
    info("Conversaciones con más niveles de anidamiento (QUOTES*1..6)\n")
    rows = q("""
        MATCH path = (root:Post)-[:QUOTES*1..6]->(leaf:Post)
        WHERE NOT (root)<-[:QUOTES]-()
        WITH path, length(path) AS profundidad
        ORDER BY profundidad DESC LIMIT 5
        RETURN [n IN nodes(path) | left(n.id, 6)] AS cadena,
               [n IN nodes(path) | n.score]       AS scores,
               profundidad
    """)
    if rows:
        for i, r in enumerate(rows, 1):
            chain = " → ".join(r["cadena"])
            print(f"  {G}#{i}{RS}  profundidad {BD}{r['profundidad']}{RS} │ {chain}")
        print(f"\n  {Y}Conclusión:{RS} La cadena más larga tiene {rows[0]['profundidad']} nivel(es) de debate anidado.")
    else:
        print(f"  {DM}Sin cadenas de citas suficientes{RS}")
    pausa()

def q4_usuarios():
    cab("Q4 — Usuarios Más Influyentes")
    info("Usuarios cuyos posts son más citados por otros\n")
    rows = q("""
        MATCH (u:User)-[:WROTE]->(p:Post)<-[:QUOTES]-(reply:Post)
        WITH u, count(DISTINCT reply) AS veces_citado,
             sum(p.score) AS score_total,
             count(DISTINCT p) AS posts_con_respuesta
        WHERE veces_citado > 0
        RETURN u.alias AS usuario, veces_citado, score_total, posts_con_respuesta
        ORDER BY veces_citado DESC LIMIT 10
    """)
    tabla(rows, ["usuario", "veces_citado", "score_total", "posts_con_respuesta"])
    pausa()

def q5_boards():
    cab("Q5 — Boards sin Moderador")
    info("Boards que no tienen ningún nodo :User:Moderator con relación MANAGES\n")
    rows = q("""
        MATCH (b:Board)
        WHERE NOT (b)<-[:MANAGES]-(:User:Moderator)
        OPTIONAL MATCH (b)-[:HAS_THREAD]->(:Thread)-[:HAS_POST]->(p:Post)
        WITH b, count(p) AS total_posts
        RETURN b.name AS board, b.nsfw AS nsfw,
               toString(b.created_at) AS creado, total_posts
        ORDER BY total_posts DESC
    """)
    tabla(rows, ["board", "nsfw", "total_posts"])
    if rows:
        total_posts = sum(r["total_posts"] for r in rows)
        print(f"\n  {Y}Conclusión:{RS} {len(rows)} boards sin moderador — {total_posts} posts sin supervisión.")
    pausa()

def q6_reportes():
    cab("Q6 — Distribución de Reportes por Board")
    info("Tasa de resolución de reportes por board\n")
    rows = q("""
        MATCH (b:Board)-[:HAS_THREAD]->(:Thread)-[:HAS_POST]->(p:Post)<-[:TARGETS]-(r:Report)
        WITH b.name AS board, r.resolved AS resuelto, count(r) AS total
        WITH board,
             sum(total) AS total_reports,
             sum(CASE WHEN resuelto THEN total ELSE 0 END) AS resueltos
        RETURN board, total_reports, resueltos,
               round(toFloat(resueltos) / total_reports * 100, 1) AS pct_resolucion
        ORDER BY total_reports DESC
    """)
    tabla(rows, ["board", "total_reports", "resueltos", "pct_resolucion"])
    pausa()

def q7_stats():
    cab("Q7 — Estadísticas por Board")
    info("Threads, posts, score promedio y posts eliminados\n")
    rows = q("""
        MATCH (b:Board)-[:HAS_THREAD]->(t:Thread)-[:HAS_POST]->(p:Post)
        RETURN b.name AS board,
               count(DISTINCT t) AS threads,
               count(p)          AS posts,
               round(avg(p.score), 1)  AS score_prom,
               max(p.score)            AS score_top,
               sum(CASE WHEN p.deleted THEN 1 ELSE 0 END) AS eliminados
        ORDER BY posts DESC
    """)
    tabla(rows, ["board", "threads", "posts", "score_prom", "eliminados"])
    pausa()

def q8_pagerank():
    cab("Q8 — PageRank de Posts (GDS Plugin)")
    info("Importancia de cada post según cuántos otros posts lo citan transitivamente\n")

    # Limpiar grafo previo si existe
    try: q("CALL gds.graph.drop('post-graph', false) YIELD graphName")
    except: pass

    try:
        q("CALL gds.graph.project('post-graph', 'Post', {QUOTES: {orientation: 'NATURAL'}})")
        rows = q("""
            CALL gds.pageRank.stream('post-graph', {maxIterations: 20, dampingFactor: 0.85})
            YIELD nodeId, score
            WITH gds.util.asNode(nodeId) AS post, score
            WHERE score > 0.15
            RETURN post.id AS post_id,
                   left(post.content, 45) AS preview,
                   round(score, 4) AS pagerank
            ORDER BY pagerank DESC LIMIT 10
        """)
        try: q("CALL gds.graph.drop('post-graph')")
        except: pass

        tabla(rows, ["post_id", "preview", "pagerank"])
        if rows:
            print(f"\n  {Y}Conclusión:{RS} Posts con mayor PageRank son los más citados transitivamente.")
            print(f"  El algoritmo converge en 20 iteraciones con damping factor 0.85.")

    except Exception as e:
        print(f"  {Y}⚠  Plugin GDS no instalado{RS}\n")
        print(f"  Para habilitarlo:")
        print(f"    1. Abre Neo4j Desktop")
        print(f"    2. Tu DBMS → Plugins → Graph Data Science Library")
        print(f"    3. Instala y reinicia el DBMS")
        print(f"\n  {DM}Error: {str(e)[:90]}{RS}")
    pausa()

# ══════════════════════════════════════════════════════════════════════════
# ESTADÍSTICAS GLOBALES
# ══════════════════════════════════════════════════════════════════════════
def estadisticas():
    cab("Estadísticas del Grafo")
    nodos    = q("MATCH (n) RETURN count(n) AS c")[0]["c"]
    rels     = q("MATCH ()-[r]->() RETURN count(r) AS c")[0]["c"]
    aislados = q("MATCH (n) WHERE NOT (n)--() RETURN count(n) AS c")[0]["c"]

    print(f"  {BD}Resumen:{RS}")
    print(f"  {G}Nodos totales:      {BD}{nodos:,}{RS}")
    print(f"  {B}Relaciones totales: {BD}{rels:,}{RS}")
    color_ais = R if aislados > 0 else G
    print(f"  {color_ais}Nodos aislados:     {BD}{aislados}{RS}")

    print(f"\n  {BD}Por label:{RS}")
    por_label = q("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS c ORDER BY c DESC")
    for r in por_label:
        barra = "█" * min(30, int(r["c"] / max(1, nodos) * 50))
        print(f"  {C}{r['label']:<14}{RS} {G}{barra:<30}{RS} {r['c']:,}")

    print(f"\n  {BD}Por tipo de relación:{RS}")
    por_tipo = q("MATCH ()-[r]->() RETURN type(r) AS tipo, count(r) AS c ORDER BY c DESC")
    for r in por_tipo:
        print(f"  {C}{r['tipo']:<22}{RS} {r['c']:,}")
    pausa()

# ══════════════════════════════════════════════════════════════════════════
# ENTRADA
# ══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    cls()
    print(f"\n{G}  Conectando a Neo4j — {URI}...{RS}")
    try:
        q("RETURN 1")
        print(f"{G}  ✓ Conexión exitosa{RS}")
        import time; time.sleep(0.6)
    except Exception as e:
        print(f"{R}  ✗ No se pudo conectar: {e}{RS}")
        print(f"  Verifica que Neo4j esté corriendo en {URI}")
        sys.exit(1)
    principal()
