from neo4j import AsyncGraphDatabase
from serializer import serialize

URI      = "bolt://localhost:7687"
USER     = "neo4j"
PASSWORD = "pala1234"

driver = AsyncGraphDatabase.driver(URI, auth=(USER, PASSWORD))

async def run_query(query: str, **params) -> list:
    async with driver.session(database="neo4j") as session:
        result = await session.run(query, **params)
        raw    = await result.data()
        return [serialize(row) for row in raw]
