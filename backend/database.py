from neo4j import AsyncGraphDatabase
from serializer import serialize

URI      = "neo4j://127.0.0.1:7687"
USER     = "neo4j"
PASSWORD = "MGECARG10"

driver = AsyncGraphDatabase.driver(URI, auth=(USER, PASSWORD))

async def run_query(query: str, **params) -> list:
    async with driver.session(database="neo4j") as session:
        result = await session.run(query, **params)
        raw    = await result.data()
        return [serialize(row) for row in raw]
