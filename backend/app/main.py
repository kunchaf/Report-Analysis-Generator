from pathlib import Path
from dotenv import load_dotenv

# Load env before any service modules are imported
_backend_root = Path(__file__).parent.parent
load_dotenv(dotenv_path=_backend_root / ".env")
load_dotenv(dotenv_path=_backend_root / "app" / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app.include_router(routes.router, prefix="/api")
app.include_router(notifications.router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Report & Analysis Intelligence Generator API is running"}
