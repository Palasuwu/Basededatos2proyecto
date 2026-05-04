from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import boards, threads, posts, users, nodes, relationships, analytics, csv_loader


app = FastAPI(title="ChanDB API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(boards.router)
app.include_router(threads.router)
app.include_router(posts.router)
app.include_router(users.router)
app.include_router(nodes.router)
app.include_router(relationships.router)
app.include_router(analytics.router)
app.include_router(csv_loader.router)

@app.get("/")
async def root():
    return {"status": "ok", "message": "ChanDB API running"}
