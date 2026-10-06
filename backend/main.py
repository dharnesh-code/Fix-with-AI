import asyncio
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

from bson import ObjectId
from fastapi import Depends, FastAPI, File, Form, HTTPException, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError

import gemini_client
from auth import create_access_token, decode_token, hash_password, verify_password
from database import close_db, connect_db, get_db
from schemas import (
    ChatMessage,
    ChatResponse,
    DiagnoseQueued,
    TaskStatus,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Fix With AI API")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    await connect_db()
    logger.info("MongoDB connected.")


@app.on_event("shutdown")
async def shutdown():
    await close_db()


# ---------------------------------------------------------------------------
# Thread pool + in-memory stores
# ---------------------------------------------------------------------------

_thread_pool = ThreadPoolExecutor(max_workers=4)

SESSIONS: dict[str, dict] = {}
TASKS: dict[str, dict] = {}

MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

async def get_current_user(authorization: str = Header(default=None)):
    """Extract and validate JWT from Authorization: Bearer <token> header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token.")
        return {"user_id": user_id, "email": email}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid.")


async def get_optional_user(authorization: str = Header(default=None)):
    """Like get_current_user but returns None instead of raising if not authed."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.post("/api/auth/register", status_code=201)
async def register(body: dict):
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    db = get_db()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user_doc = {
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_access_token(user_id, email)

    return {"token": token, "user": {"id": user_id, "name": name, "email": email}}


@app.post("/api/auth/login")
async def login(body: dict):
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    user_id = str(user["_id"])
    token = create_access_token(user_id, email)
    return {"token": token, "user": {"id": user_id, "name": user["name"], "email": email}}


@app.get("/api/auth/me")
async def me(current_user=Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"]}


# ---------------------------------------------------------------------------
# History endpoints
# ---------------------------------------------------------------------------

@app.get("/api/history")
async def get_history(current_user=Depends(get_current_user)):
    """Return all past diagnoses for the logged-in user, newest first."""
    db = get_db()
    cursor = db.diagnoses.find(
        {"user_id": current_user["user_id"]},
        sort=[("created_at", -1)],
    )
    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "description": doc.get("description", ""),
            "diagnosis": doc["diagnosis"],
            "evaluator_notes": doc.get("evaluator_notes", []),
            "created_at": doc["created_at"].isoformat(),
        })
    return results


@app.delete("/api/history/{diagnosis_id}")
async def delete_history_item(diagnosis_id: str, current_user=Depends(get_current_user)):
    """Delete a specific history entry owned by the current user."""
    db = get_db()
    result = await db.diagnoses.delete_one({
        "_id": ObjectId(diagnosis_id),
        "user_id": current_user["user_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found.")
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Background worker
# ---------------------------------------------------------------------------

def _run_diagnosis_task(
    task_id: str,
    image_bytes: bytes,
    mime_type: str,
    description: str,
    user_id: str | None,
):
    """
    Runs in a background thread via ThreadPoolExecutor.
    Uses sync pymongo (not Motor) for the DB save — Motor is bound to
    FastAPI's event loop and cannot be used from a different thread.
    """
    TASKS[task_id]["status"] = "processing"
    logger.info("[TASK %s] Starting diagnosis pipeline...", task_id)

    try:
        diagnosis, evaluator_notes = gemini_client.diagnose(image_bytes, mime_type, description)
        
        # Fetch grounded resources (YouTube, blogs)
        resources = gemini_client.fetch_resources(diagnosis.get("problem_identified", description))
        diagnosis["resources"] = resources

        session_id = str(uuid.uuid4())
        SESSIONS[session_id] = {"diagnosis": diagnosis, "history": []}

        # Save to MongoDB using sync pymongo — safe to use in threads
        if user_id:
            from pymongo import MongoClient
            _mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
            _db_name   = os.getenv("MONGODB_DB", "fixwithai")
            with MongoClient(_mongo_uri) as sync_client:
                sync_client[_db_name].diagnoses.insert_one({
                    "user_id":         user_id,
                    "session_id":      session_id,
                    "description":     description,
                    "diagnosis":       diagnosis,
                    "evaluator_notes": evaluator_notes,
                    "created_at":      datetime.now(timezone.utc),
                })
            logger.info("[TASK %s] Diagnosis saved to MongoDB.", task_id)

        TASKS[task_id].update({
            "status":          "done",
            "session_id":      session_id,
            "diagnosis":       diagnosis,
            "evaluator_notes": evaluator_notes,
        })
        logger.info("[TASK %s] Done.", task_id)

    except Exception as exc:
        logger.exception("[TASK %s] Failed: %s", task_id, exc)
        TASKS[task_id].update({"status": "error", "error": str(exc)})


# ---------------------------------------------------------------------------
# Core API endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/diagnose", response_model=DiagnoseQueued)
async def diagnose(
    image: UploadFile = File(...),
    description: str = Form(...),
    authorization: str = Header(default=None),
):
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, WEBP, or HEIC image.")

    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large. Max size is 8MB.")
    if not description or not description.strip():
        raise HTTPException(status_code=400, detail="Please describe the problem.")

    # Extract user_id if authenticated (optional auth)
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            payload = decode_token(authorization.removeprefix("Bearer ").strip())
            user_id = payload.get("sub")
        except Exception:
            pass

    task_id = str(uuid.uuid4())
    TASKS[task_id] = {"status": "queued", "task_id": task_id}

    loop = asyncio.get_event_loop()
    loop.run_in_executor(
        _thread_pool,
        _run_diagnosis_task,
        task_id,
        image_bytes,
        image.content_type,
        description.strip(),
        user_id,
    )

    logger.info("[TASK %s] Enqueued (user=%s).", task_id, user_id or "anonymous")
    return {"task_id": task_id, "status": "queued"}


@app.get("/api/task/{task_id}", response_model=TaskStatus)
def get_task(task_id: str):
    task = TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatMessage):
    session = SESSIONS.get(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        loop = asyncio.get_event_loop()
        reply = await loop.run_in_executor(
            _thread_pool,
            gemini_client.chat_reply,
            session["diagnosis"],
            session["history"],
            payload.message,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    session["history"].append({"role": "user", "content": payload.message})
    session["history"].append({"role": "model", "content": reply})
    return {"session_id": payload.session_id, "reply": reply}


@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session
