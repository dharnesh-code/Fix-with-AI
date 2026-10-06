from typing import List, Optional
from pydantic import BaseModel


class RepairStep(BaseModel):
    step_number: int
    title: str
    detail: str
    warning: Optional[str] = None


class FlowNode(BaseModel):
    id: int
    label: str
    next: Optional[int] = None


class Diagnosis(BaseModel):
    category: str  # plumbing | carpentry | electronics
    problem_identified: str
    risk_level: str  # low | medium | high
    professional_help_required: bool
    tools_and_materials: List[str]
    precautions: List[str]
    steps: List[RepairStep]
    flowchart: List[FlowNode]
    estimated_time: str
    confidence_note: Optional[str] = None


class DiagnoseResponse(BaseModel):
    session_id: str
    diagnosis: Diagnosis
    evaluator_notes: List[str] = []  # Empty = clean pass; non-empty = issues found/fixed


# --- Async task queue models ---

class DiagnoseQueued(BaseModel):
    """Returned immediately when a diagnosis task is enqueued."""
    task_id: str
    status: str  # always "queued" on creation


class TaskStatus(BaseModel):
    """Returned when polling GET /api/task/{task_id}."""
    task_id: str
    status: str                          # queued | processing | done | error
    session_id: Optional[str] = None     # set when done
    diagnosis: Optional[Diagnosis] = None
    evaluator_notes: List[str] = []
    error: Optional[str] = None          # set when status = error


# --- Chat models ---

class ChatMessage(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
