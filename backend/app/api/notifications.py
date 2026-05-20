import asyncio
import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/api/notifications/stream")
async def event_stream(request: Request):
    """
    Server-Sent Events endpoint for real-time progress updates.
    Stops cleanly when the client disconnects.
    """

    async def event_generator():
        progress_steps = [
            {"status": "started", "message": "Initializing analysis engine...", "progress": 0},
            {"status": "processing", "message": "Running Executive Summary...", "progress": 20},
            {"status": "processing", "message": "Running Strategic Analysis...", "progress": 40},
            {"status": "processing", "message": "Running Critical Analysis...", "progress": 60},
            {"status": "processing", "message": "Running Opportunities & Risks...", "progress": 80},
            {"status": "processing", "message": "Compiling PDF report...", "progress": 90},
            {"status": "complete", "message": "Report ready.", "progress": 100},
        ]

        for step in progress_steps:
            # Stop sending if the client has disconnected
            if await request.is_disconnected():
                break
            yield f"data: {json.dumps(step)}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering if behind a proxy
        },
    )
