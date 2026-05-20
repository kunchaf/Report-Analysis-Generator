from pathlib import Path
from dotenv import load_dotenv

# Load env before any service modules are imported
_backend_root = Path(__file__).parent.parent
load_dotenv(dotenv_path=_backend_root / ".env")
load_dotenv(dotenv_path=_backend_root / "app" / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api import routes, notifications

app = FastAPI(
    title="Report & Analysis Intelligence Generator API",
    description="AI-powered Multi-Perspective Report Analysis and Generation System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(routes.router, prefix="/api")
app.include_router(notifications.router)

# Serve React frontend static files (built into frontend/dist)
_dist = _backend_root.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

    # Catch-all: serve index.html for any non-API route (React SPA routing)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = _dist / "index.html"
        return FileResponse(str(index))
else:
    @app.get("/")
    async def root():
        return {"status": "ok", "message": "Report & Analysis Intelligence Generator API is running"}
