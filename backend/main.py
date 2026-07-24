import os
import uuid

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import gemini_client
from schemas import ChatMessage, ChatResponse, DiagnoseResponse

app = FastAPI(title="Fix With AI API")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store. Swap for Redis/a database for production/multi-instance use.
SESSIONS: dict[str, dict] = {}

MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/diagnose", response_model=DiagnoseResponse)
async def diagnose(image: UploadFile = File(...), description: str = Form(...)):
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, WEBP, or HEIC image.")

    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large. Max size is 8MB.")

    if not description or not description.strip():
        raise HTTPException(status_code=400, detail="Please describe the problem.")

    try:
        diagnosis = gemini_client.diagnose(image_bytes, image.content_type, description.strip())
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"AI response could not be parsed: {exc}")

    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {"diagnosis": diagnosis, "history": []}

    return {"session_id": session_id, "diagnosis": diagnosis}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatMessage):
    session = SESSIONS.get(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Please start a new diagnosis.")

    try:
        reply = gemini_client.chat_reply(session["diagnosis"], session["history"], payload.message)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    session["history"].append({"role": "user", "content": payload.message})
    session["history"].append({"role": "model", "content": reply})

    return {"session_id": payload.session_id, "reply": reply}


@app.get("/api/history/{session_id}")
def get_history(session_id: str):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session
