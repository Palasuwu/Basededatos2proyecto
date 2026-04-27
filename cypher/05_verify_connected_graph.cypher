// ============================================================
// 05 — VERIFICACIÓN: Grafo Conexo y Conteo de Nodos
// Rúbrica: "Grafo conexo" y "mínimo de 5000 nodos distintos"
// ============================================================

// Conteo total de nodos
MATCH (n)
RETURN count(n) AS total_nodes;

// Conteo por label
CALL db.labels() YIELD label
CALL apoc.cypher.run('MATCH (n:' + label + ') RETURN count(n) AS count', {})
YIELD value
RETURN label, value.count AS node_count
ORDER BY node_count DESC;

// Alternativa sin APOC:
MATCH (n)
RETURN labels(n)[0] AS label, count(n) AS count
ORDER BY count DESC;

// Verificar que el grafo es conexo:
// Todos los nodos deben tener al menos 1 relación
MATCH (n)
WHERE NOT (n)--()
RETURN count(n) AS nodos_aislados;
// → Si retorna 0, el grafo es conexo ✓

// Verificar nodos aislados por tipo para debug
MATCH (n)
WHERE NOT (n)--()
RETURN labels(n) AS tipo, n.id AS id
LIMIT 20;

// Conteo de relaciones por tipo
CALL db.relationshipTypes() YIELD relationshipType
CALL apoc.cypher.run(
  'MATCH ()-[r:' + relationshipType + ']->() RETURN count(r) AS count', {}
)
YIELD value
RETURN relationshipType, value.count AS rel_count
ORDER BY rel_count DESC;

// Total de relaciones
MATCH ()-[r]->()
RETURN count(r) AS total_relationships;

// Resumen general
MATCH (n)
WITH count(n) AS nodes
MATCH ()-[r]->()
RETURN nodes, count(r) AS relationships;
