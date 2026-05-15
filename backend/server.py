from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone
from io import BytesIO

from emergentintegrations.llm.chat import LlmChat, UserMessage
from pypdf import PdfReader
from docx import Document as DocxDocument


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
CLAUDE_MODEL = "claude-haiku-4-5-20251001"

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- MODELS ----------
class Subject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    notes: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    notes: Optional[str] = ""


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New chat"
    subject_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New chat"
    subject_id: Optional[str] = None


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatSendRequest(BaseModel):
    session_id: str
    message: str


class WorksheetRequest(BaseModel):
    subject_id: Optional[str] = None
    topic: str
    num_questions: int = 5
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "medium"
    question_type: Literal["multiple_choice", "short_answer", "long_answer", "mixed"] = "mixed"
    extra_instructions: Optional[str] = ""


class WorksheetQuestion(BaseModel):
    number: int
    type: str
    question: str
    options: Optional[List[str]] = None
    answer: str
    explanation: Optional[str] = ""


class Worksheet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject_id: Optional[str] = None
    subject_name: Optional[str] = ""
    topic: str
    difficulty: str
    question_type: str
    num_questions: int
    title: str
    questions: List[WorksheetQuestion]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------- HELPERS ----------
def serialize_doc(doc: dict) -> dict:
    """Serialize datetime to ISO string for MongoDB storage."""
    out = dict(doc)
    for k, v in out.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


def parse_datetime(value):
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except Exception:
            return datetime.now(timezone.utc)
    return value


async def get_subject(subject_id: str) -> Optional[dict]:
    return await db.subjects.find_one({"id": subject_id}, {"_id": 0})


def build_system_message(subject: Optional[dict]) -> str:
    base = (
        "You are a patient, encouraging revision tutor for a single student. "
        "Explain concepts clearly with short paragraphs, simple examples, and use "
        "headings/bullets when helpful. Ask the student questions occasionally to "
        "check understanding. Keep answers focused and practical."
    )
    if subject:
        ctx = f"\n\nThe current revision subject is: {subject['name']}."
        if subject.get('description'):
            ctx += f"\nSubject description: {subject['description']}"
        if subject.get('notes'):
            notes = subject['notes'][:8000]
            ctx += f"\n\nReference notes provided by the student (use these as ground truth when relevant):\n---\n{notes}\n---"
        base += ctx
    return base


def extract_text_from_upload(filename: str, raw: bytes) -> str:
    name = filename.lower()
    if name.endswith('.pdf'):
        reader = PdfReader(BytesIO(raw))
        parts = []
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n".join(parts).strip()
    if name.endswith('.docx'):
        doc = DocxDocument(BytesIO(raw))
        return "\n".join(p.text for p in doc.paragraphs).strip()
    # txt / md / fallback
    try:
        return raw.decode('utf-8', errors='ignore').strip()
    except Exception:
        return ""


# ---------- BASIC ----------
@api_router.get("/")
async def root():
    return {"message": "Revisia API", "model": CLAUDE_MODEL}


@api_router.get("/health")
async def health():
    return {"ok": True, "has_key": bool(ANTHROPIC_API_KEY)}


# ---------- SUBJECTS ----------
@api_router.get("/subjects", response_model=List[Subject])
async def list_subjects():
    docs = await db.subjects.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d['created_at'] = parse_datetime(d.get('created_at'))
    return docs


@api_router.post("/subjects", response_model=Subject)
async def create_subject(payload: SubjectCreate):
    obj = Subject(**payload.model_dump())
    await db.subjects.insert_one(serialize_doc(obj.model_dump()))
    return obj


@api_router.get("/subjects/{subject_id}", response_model=Subject)
async def get_subject_endpoint(subject_id: str):
    doc = await get_subject(subject_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Subject not found")
    doc['created_at'] = parse_datetime(doc.get('created_at'))
    return doc


@api_router.patch("/subjects/{subject_id}", response_model=Subject)
async def update_subject(subject_id: str, payload: SubjectUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.subjects.update_one({"id": subject_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    doc = await get_subject(subject_id)
    doc['created_at'] = parse_datetime(doc.get('created_at'))
    return doc


@api_router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str):
    result = await db.subjects.delete_one({"id": subject_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    # Also clean up sessions/messages tied to it (optional)
    await db.chat_sessions.update_many({"subject_id": subject_id}, {"$set": {"subject_id": None}})
    return {"ok": True}


@api_router.post("/subjects/{subject_id}/upload")
async def upload_subject_notes(subject_id: str, file: UploadFile = File(...), append: bool = Form(True)):
    doc = await get_subject(subject_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Subject not found")
    raw = await file.read()
    text = extract_text_from_upload(file.filename or "file.txt", raw)
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from file")
    new_notes = (doc.get('notes') or '')
    if append and new_notes:
        new_notes = new_notes + "\n\n--- " + (file.filename or 'file') + " ---\n" + text
    else:
        new_notes = text
    await db.subjects.update_one({"id": subject_id}, {"$set": {"notes": new_notes}})
    return {"ok": True, "filename": file.filename, "characters": len(text)}


# ---------- CHAT ----------
@api_router.get("/chat/sessions", response_model=List[ChatSession])
async def list_sessions():
    docs = await db.chat_sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d['created_at'] = parse_datetime(d.get('created_at'))
    return docs


@api_router.post("/chat/sessions", response_model=ChatSession)
async def create_session(payload: ChatSessionCreate):
    obj = ChatSession(**payload.model_dump())
    await db.chat_sessions.insert_one(serialize_doc(obj.model_dump()))
    return obj


@api_router.delete("/chat/sessions/{session_id}")
async def delete_session(session_id: str):
    await db.chat_sessions.delete_one({"id": session_id})
    await db.chat_messages.delete_many({"session_id": session_id})
    return {"ok": True}


@api_router.get("/chat/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def get_messages(session_id: str):
    docs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    for d in docs:
        d['created_at'] = parse_datetime(d.get('created_at'))
    return docs


@api_router.post("/chat/send", response_model=ChatMessage)
async def send_message(payload: ChatSendRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    session = await db.chat_sessions.find_one({"id": payload.session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    subject = None
    if session.get('subject_id'):
        subject = await get_subject(session['subject_id'])

    # Save user message
    user_msg = ChatMessage(session_id=payload.session_id, role="user", content=payload.message)
    await db.chat_messages.insert_one(serialize_doc(user_msg.model_dump()))

    # Auto-title first message
    msg_count = await db.chat_messages.count_documents({"session_id": payload.session_id})
    if msg_count == 1 and (session.get('title') in (None, '', 'New chat')):
        title = payload.message.strip()[:60]
        await db.chat_sessions.update_one({"id": payload.session_id}, {"$set": {"title": title}})

    system_message = build_system_message(subject)
    chat = LlmChat(
        api_key=ANTHROPIC_API_KEY,
        session_id=payload.session_id,
        system_message=system_message,
    ).with_model("anthropic", CLAUDE_MODEL)

    try:
        response_text = await chat.send_message(UserMessage(text=payload.message))
    except Exception as e:
        logger.exception("Claude error")
        raise HTTPException(status_code=502, detail=f"AI error: {str(e)}")

    ai_msg = ChatMessage(session_id=payload.session_id, role="assistant", content=response_text)
    await db.chat_messages.insert_one(serialize_doc(ai_msg.model_dump()))
    return ai_msg


# ---------- WORKSHEETS ----------
WORKSHEET_SYSTEM = (
    "You are an expert exam-style worksheet generator. You MUST return ONLY valid JSON "
    "matching the requested schema. No prose, no markdown, no code fences."
)


def build_worksheet_prompt(req: WorksheetRequest, subject: Optional[dict]) -> str:
    type_map = {
        "multiple_choice": "Every question must be multiple choice with exactly 4 options labelled A-D.",
        "short_answer": "Every question must be a short-answer question (1-3 sentences).",
        "long_answer": "Every question must be a long-answer / extended response question.",
        "mixed": "Mix of multiple choice (with 4 options), short answer, and one or two long answer questions. Roughly 50% MCQ, 30% short, 20% long.",
    }
    parts = [
        f"Generate a revision worksheet on the topic: \"{req.topic}\".",
        f"Number of questions: {req.num_questions}.",
        f"Difficulty: {req.difficulty}.",
        f"Question style: {type_map[req.question_type]}",
    ]
    if subject:
        parts.append(f"Subject: {subject['name']}.")
        if subject.get('description'):
            parts.append(f"Subject context: {subject['description']}")
        if subject.get('notes'):
            parts.append(f"Use these student notes as ground truth where relevant:\n---\n{subject['notes'][:6000]}\n---")
    if req.extra_instructions:
        parts.append(f"Additional instructions: {req.extra_instructions}")
    parts.append(
        "Return ONLY a JSON object with this exact shape:\n"
        "{\n"
        '  "title": "<short worksheet title>",\n'
        '  "questions": [\n'
        '    {\n'
        '      "number": 1,\n'
        '      "type": "multiple_choice" | "short_answer" | "long_answer",\n'
        '      "question": "<the question>",\n'
        '      "options": ["A) ...", "B) ...", "C) ...", "D) ..."]  (only for multiple_choice, else omit or null),\n'
        '      "answer": "<the correct answer; for MCQ use the letter and full text>",\n'
        '      "explanation": "<1-3 sentence explanation>"\n'
        '    }\n'
        '  ]\n'
        '}\n'
        "Do not wrap in code fences. Do not include any text outside the JSON."
    )
    return "\n\n".join(parts)


def parse_worksheet_json(text: str) -> dict:
    # Strip code fences if present
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    # Extract first {...} block
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        raise ValueError("No JSON object found in model output")
    return json.loads(match.group(0))


@api_router.post("/worksheets/generate", response_model=Worksheet)
async def generate_worksheet(req: WorksheetRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    subject = None
    if req.subject_id:
        subject = await get_subject(req.subject_id)

    prompt = build_worksheet_prompt(req, subject)
    session_id = f"worksheet-{uuid.uuid4()}"
    chat = LlmChat(
        api_key=ANTHROPIC_API_KEY,
        session_id=session_id,
        system_message=WORKSHEET_SYSTEM,
    ).with_model("anthropic", CLAUDE_MODEL)

    try:
        raw = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.exception("Claude error")
        raise HTTPException(status_code=502, detail=f"AI error: {str(e)}")

    try:
        data = parse_worksheet_json(raw)
    except Exception as e:
        logger.error(f"Worksheet parse failed. Raw output: {raw[:1000]}")
        raise HTTPException(status_code=502, detail=f"Could not parse worksheet JSON: {e}")

    questions = []
    for i, q in enumerate(data.get('questions', []), start=1):
        questions.append(WorksheetQuestion(
            number=q.get('number') or i,
            type=q.get('type', 'short_answer'),
            question=q.get('question', ''),
            options=q.get('options') if q.get('options') else None,
            answer=q.get('answer', ''),
            explanation=q.get('explanation', '') or '',
        ))

    ws = Worksheet(
        subject_id=req.subject_id,
        subject_name=subject['name'] if subject else "",
        topic=req.topic,
        difficulty=req.difficulty,
        question_type=req.question_type,
        num_questions=req.num_questions,
        title=data.get('title') or f"Worksheet: {req.topic}",
        questions=questions,
    )
    await db.worksheets.insert_one(serialize_doc(ws.model_dump()))
    return ws


@api_router.get("/worksheets", response_model=List[Worksheet])
async def list_worksheets():
    docs = await db.worksheets.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for d in docs:
        d['created_at'] = parse_datetime(d.get('created_at'))
    return docs


@api_router.get("/worksheets/{worksheet_id}", response_model=Worksheet)
async def get_worksheet(worksheet_id: str):
    doc = await db.worksheets.find_one({"id": worksheet_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Worksheet not found")
    doc['created_at'] = parse_datetime(doc.get('created_at'))
    return doc


@api_router.delete("/worksheets/{worksheet_id}")
async def delete_worksheet(worksheet_id: str):
    res = await db.worksheets.delete_one({"id": worksheet_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Worksheet not found")
    return {"ok": True}


# ---------- Mount ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
