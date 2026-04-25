from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="Synapse API",
    description="Next-generation AI research notebook",
    version="1.0.0"
)

# CORS
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from routers import notebooks, sources, chat, research, faceoff, avatar, podcast, outputs, search, graph

# Register routers
app.include_router(notebooks.router, prefix="/api/notebooks", tags=["notebooks"])
app.include_router(sources.router, prefix="/api/notebooks", tags=["sources"])
app.include_router(chat.router, prefix="/api/notebooks", tags=["chat"])
app.include_router(research.router, prefix="/api/notebooks", tags=["research"])
app.include_router(faceoff.router, prefix="/api/notebooks", tags=["faceoff"])
app.include_router(avatar.router, prefix="/api/notebooks", tags=["avatar"])
app.include_router(podcast.router, prefix="/api/notebooks", tags=["podcast"])
app.include_router(outputs.router, prefix="/api/notebooks", tags=["outputs"])
app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(graph.router, prefix="/api/notebooks", tags=["graph"])

@app.get("/")
async def root():
    return {
        "message": "Synapse API",
        "version": "1.0.0",
        "tagline": "NotebookLM gives you one brain. Synapse gives you many."
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
