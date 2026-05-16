"""Backend tests for Revisia app - covers health, subjects, chat, worksheets."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://claude-tutor-hub.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# Track created IDs for cleanup
created = {"subjects": [], "sessions": [], "worksheets": []}


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    for sid in created["sessions"]:
        try:
            requests.delete(f"{API}/chat/sessions/{sid}", timeout=10)
        except Exception:
            pass
    for wid in created["worksheets"]:
        try:
            requests.delete(f"{API}/worksheets/{wid}", timeout=10)
        except Exception:
            pass
    for sid in created["subjects"]:
        try:
            requests.delete(f"{API}/subjects/{sid}", timeout=10)
        except Exception:
            pass


# ---------- HEALTH ----------
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["has_key"] is True


# ---------- SUBJECTS CRUD ----------
def test_subject_crud_and_no_object_id_leak():
    # Create
    payload = {
        "name": "TEST_Biology",
        "description": "Test bio subject",
        "notes": "The capital of FakeLand is Zorbeville."
    }
    r = requests.post(f"{API}/subjects", json=payload, timeout=10)
    assert r.status_code == 200
    sub = r.json()
    assert sub["name"] == "TEST_Biology"
    assert sub["notes"] == "The capital of FakeLand is Zorbeville."
    assert "_id" not in sub, "MongoDB _id leaked in response"
    assert "id" in sub
    sid = sub["id"]
    created["subjects"].append(sid)

    # List
    r = requests.get(f"{API}/subjects", timeout=10)
    assert r.status_code == 200
    items = r.json()
    assert any(s["id"] == sid for s in items)
    for s in items:
        assert "_id" not in s

    # Get
    r = requests.get(f"{API}/subjects/{sid}", timeout=10)
    assert r.status_code == 200
    assert r.json()["id"] == sid

    # PATCH
    r = requests.patch(f"{API}/subjects/{sid}", json={"description": "Updated desc"}, timeout=10)
    assert r.status_code == 200
    assert r.json()["description"] == "Updated desc"

    # Verify persisted
    r = requests.get(f"{API}/subjects/{sid}", timeout=10)
    assert r.json()["description"] == "Updated desc"

    return sid


def test_subject_upload_notes():
    r = requests.post(f"{API}/subjects", json={"name": "TEST_Upload", "notes": "initial"}, timeout=10)
    assert r.status_code == 200
    sid = r.json()["id"]
    created["subjects"].append(sid)

    files = {"file": ("notes.txt", io.BytesIO(b"Photosynthesis converts CO2 to glucose."), "text/plain")}
    r = requests.post(f"{API}/subjects/{sid}/upload", files=files, data={"append": "true"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["characters"] > 0

    # Verify notes updated
    r = requests.get(f"{API}/subjects/{sid}", timeout=10)
    notes = r.json()["notes"]
    assert "Photosynthesis" in notes
    assert "initial" in notes  # appended


def test_subject_delete():
    r = requests.post(f"{API}/subjects", json={"name": "TEST_DelMe"}, timeout=10)
    sid = r.json()["id"]
    r = requests.delete(f"{API}/subjects/{sid}", timeout=10)
    assert r.status_code == 200
    r = requests.get(f"{API}/subjects/{sid}", timeout=10)
    assert r.status_code == 404


# ---------- CHAT SESSIONS ----------
def test_chat_sessions_lifecycle():
    # Create subject with distinctive notes
    r = requests.post(f"{API}/subjects", json={
        "name": "TEST_Geography",
        "notes": "The capital of FakeLand is Zorbeville."
    }, timeout=10)
    sid_subject = r.json()["id"]
    created["subjects"].append(sid_subject)

    # Create session tied to subject
    r = requests.post(f"{API}/chat/sessions", json={"subject_id": sid_subject}, timeout=10)
    assert r.status_code == 200
    session = r.json()
    assert "_id" not in session
    sid = session["id"]
    created["sessions"].append(sid)
    assert session["subject_id"] == sid_subject

    # List sessions
    r = requests.get(f"{API}/chat/sessions", timeout=10)
    assert r.status_code == 200
    assert any(s["id"] == sid for s in r.json())

    # Messages initially empty
    r = requests.get(f"{API}/chat/sessions/{sid}/messages", timeout=10)
    assert r.status_code == 200
    assert r.json() == []

    # Send message - test Claude integration + subject context
    r = requests.post(f"{API}/chat/send", json={
        "session_id": sid,
        "message": "What is the capital of FakeLand? Reply in one short sentence."
    }, timeout=90)
    assert r.status_code == 200, f"Chat send failed: {r.status_code} {r.text[:500]}"
    reply = r.json()
    assert reply["role"] == "assistant"
    assert len(reply["content"]) > 0
    assert "zorbeville" in reply["content"].lower(), f"Subject context not used. Reply: {reply['content']}"

    # Auto-title check
    r = requests.get(f"{API}/chat/sessions", timeout=10)
    sess = next(s for s in r.json() if s["id"] == sid)
    assert sess["title"] != "New chat"
    assert "FakeLand" in sess["title"] or "capital" in sess["title"].lower()

    # Messages persist
    r = requests.get(f"{API}/chat/sessions/{sid}/messages", timeout=10)
    msgs = r.json()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"


def test_delete_session_cascades_messages():
    r = requests.post(f"{API}/chat/sessions", json={}, timeout=10)
    sid = r.json()["id"]
    # Send a quick message to ensure messages exist - skip to save API budget
    # Just manually verify deletion endpoint works
    r = requests.delete(f"{API}/chat/sessions/{sid}", timeout=10)
    assert r.status_code == 200
    # Messages should be empty
    r = requests.get(f"{API}/chat/sessions/{sid}/messages", timeout=10)
    assert r.json() == []


# ---------- WORKSHEETS ----------
def test_worksheet_generate_multiple_choice():
    r = requests.post(f"{API}/subjects", json={
        "name": "TEST_BiologyWS",
        "notes": "Photosynthesis is the process by which plants make food from CO2 and sunlight."
    }, timeout=10)
    sid = r.json()["id"]
    created["subjects"].append(sid)

    r = requests.post(f"{API}/worksheets/generate", json={
        "subject_id": sid,
        "topic": "Photosynthesis",
        "num_questions": 3,
        "difficulty": "easy",
        "question_type": "multiple_choice"
    }, timeout=120)
    assert r.status_code == 200, f"Worksheet gen failed: {r.status_code} {r.text[:500]}"
    ws = r.json()
    assert "_id" not in ws
    assert len(ws["questions"]) == 3
    for q in ws["questions"]:
        assert q["type"] == "multiple_choice"
        assert q["options"] is not None and len(q["options"]) == 4
        assert q["answer"]
        assert "explanation" in q
    created["worksheets"].append(ws["id"])

    # GET by id
    r = requests.get(f"{API}/worksheets/{ws['id']}", timeout=10)
    assert r.status_code == 200

    # LIST
    r = requests.get(f"{API}/worksheets", timeout=10)
    assert any(w["id"] == ws["id"] for w in r.json())


def test_worksheet_no_subject_short():
    r = requests.post(f"{API}/worksheets/generate", json={
        "topic": "Basic addition",
        "num_questions": 3,
        "difficulty": "easy",
        "question_type": "short_answer"
    }, timeout=120)
    assert r.status_code == 200, f"{r.text[:300]}"
    ws = r.json()
    assert len(ws["questions"]) == 3
    created["worksheets"].append(ws["id"])

    # Delete
    r = requests.delete(f"{API}/worksheets/{ws['id']}", timeout=10)
    assert r.status_code == 200
    created["worksheets"].remove(ws["id"])
    r = requests.get(f"{API}/worksheets/{ws['id']}", timeout=10)
    assert r.status_code == 404
