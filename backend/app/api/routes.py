import os
import re
import json
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from app.services.analyzer import analyze_topic, _analyze_perspective
from app.services.pdf_engine import generate_pdf

router = APIRouter()


class AnalyzeRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=5000)
    perspectives: List[str] = [
        "executive_summary",
        "strategic_analysis",
        "critical_analysis",
        "opportunities_risks",
    ]


class GeneratePdfRequest(BaseModel):
    """Accept already-computed analysis data and convert it to PDF — no AI call."""
    topic: str
    generated_at: str
    perspectives: Dict[str, Any]


def _safe_filename(topic: str) -> str:
    """Strip non-ASCII and special chars so the filename is safe for HTTP headers."""
    safe = re.sub(r'[^\w\s-]', '', topic, flags=re.ASCII)
    safe = re.sub(r'\s+', '_', safe.strip())
    return (safe[:50] or "report") + ".pdf"


def _cleanup_file(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass


@router.post("/analyze")
async def analyze(request: AnalyzeRequest):
    """Run multi-perspective AI analysis and return JSON."""
    try:
        result = await analyze_topic(request.topic, request.perspectives)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-stream")
async def analyze_stream(request: AnalyzeRequest, req: Request):
    """
    Stream analysis results as Server-Sent Events.
    Each perspective is sent as soon as it completes — no waiting for all 4.
    """
    from app.services.analyzer import PERSPECTIVE_PROMPTS, _INTER_REQUEST_DELAY
    from datetime import datetime

    valid = [p for p in request.perspectives if p in PERSPECTIVE_PROMPTS]
    if not valid:
        valid = list(PERSPECTIVE_PROMPTS.keys())[:4]

    async def event_generator():
        results = {}
        generated_at = datetime.utcnow().isoformat() + "Z"

        # Send start event
        yield f"data: {json.dumps({'type': 'start', 'total': len(valid)})}\n\n"

        for i, perspective in enumerate(valid):
            if await req.is_disconnected():
                break

            # Send progress event
            yield f"data: {json.dumps({'type': 'progress', 'index': i, 'key': perspective})}\n\n"

            result = await _analyze_perspective(request.topic, perspective)
            results[result["key"]] = result

            # Send the completed perspective immediately
            yield f"data: {json.dumps({'type': 'perspective', 'data': result})}\n\n"

            if i < len(valid) - 1:
                await asyncio.sleep(_INTER_REQUEST_DELAY)

        # Send final complete event with full analysis
        final = {
            "type": "complete",
            "analysis": {
                "topic": request.topic,
                "generated_at": generated_at,
                "perspectives": results,
            }
        }
        yield f"data: {json.dumps(final)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/generate-pdf")
async def generate_pdf_from_analysis(
    request: GeneratePdfRequest, background_tasks: BackgroundTasks
):
    """Convert pre-computed analysis JSON into a downloadable PDF — no AI call."""
    try:
        analysis = {
            "topic": request.topic,
            "generated_at": request.generated_at,
            "perspectives": request.perspectives,
        }
        pdf_path = await generate_pdf(analysis)
        filename = f"RAIG_Report_{_safe_filename(request.topic)}"
        background_tasks.add_task(_cleanup_file, pdf_path)
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=filename,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-report")
async def generate_report(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Analyze + generate PDF in one call."""
    try:
        analysis = await analyze_topic(request.topic, request.perspectives)
        pdf_path = await generate_pdf(analysis)
        filename = f"RAIG_Report_{_safe_filename(request.topic)}"
        background_tasks.add_task(_cleanup_file, pdf_path)
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=filename,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    return {"status": "healthy"}
