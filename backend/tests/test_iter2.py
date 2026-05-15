"""Iteration 2 backend tests: worksheet exam-paper structure + marking + regression."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://claude-tutor-hub.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_ids():
    return {"worksheets": [], "subjects": [], "sessions": []}


def test_health(client):
    r = client.get(f"{API}/health", timeout=20)
    assert r.status_code == 200
    j = r.json()
    assert j.get("ok") is True
    assert j.get("has_key") is True


def test_subjects_crud_regression(client, created_ids):
    r = client.post(f"{API}/subjects", json={"name": "TEST_iter2_subj", "description": "d"})
    assert r.status_code == 200
    sid = r.json()["id"]
    created_ids["subjects"].append(sid)
    assert "_id" not in r.json()
    r2 = client.get(f"{API}/subjects")
    assert r2.status_code == 200
    assert any(s["id"] == sid for s in r2.json())


def test_chat_session_create_and_list(client, created_ids):
    r = client.post(f"{API}/chat/sessions", json={"title": "TEST_iter2_session"})
    assert r.status_code == 200
    sid = r.json()["id"]
    created_ids["sessions"].append(sid)
    assert "_id" not in r.json()
    r2 = client.get(f"{API}/chat/sessions")
    assert r2.status_code == 200


@pytest.fixture(scope="module")
def generated_worksheet(client, created_ids):
    """Generate a worksheet once and reuse across tests to save API budget."""
    payload = {
        "topic": "Photosynthesis",
        "num_questions": 3,
        "difficulty": "easy",
        "question_type": "mixed",
    }
    r = client.post(f"{API}/worksheets/generate", json=payload, timeout=180)
    assert r.status_code == 200, f"generate failed: {r.status_code} {r.text[:500]}"
    ws = r.json()
    created_ids["worksheets"].append(ws["id"])
    return ws


def test_worksheet_has_examp_paper_fields(generated_worksheet):
    ws = generated_worksheet
    assert "_id" not in ws
    assert ws.get("instructions"), "instructions missing"
    assert isinstance(ws.get("total_marks"), int) and ws["total_marks"] > 0
    assert isinstance(ws.get("duration_minutes"), int) and ws["duration_minutes"] > 0
    assert len(ws["questions"]) == 3
    for q in ws["questions"]:
        assert "marks" in q and isinstance(q["marks"], int) and q["marks"] >= 1
    assert ws["total_marks"] == sum(q["marks"] for q in ws["questions"]), \
        f"total_marks {ws['total_marks']} != sum {sum(q['marks'] for q in ws['questions'])}"


def test_worksheet_get_no_id_leak(client, generated_worksheet):
    r = client.get(f"{API}/worksheets/{generated_worksheet['id']}")
    assert r.status_code == 200
    j = r.json()
    assert "_id" not in j
    assert j.get("user_answers") == {}
    assert j.get("marking_result") is None


def test_worksheet_mark_endpoint(client, generated_worksheet):
    ws = generated_worksheet
    answers = {}
    # answer first 2 correctly using model answer, leave 3rd wrong
    for i, q in enumerate(ws["questions"]):
        if i < 2:
            answers[str(q["number"])] = q["answer"]
        else:
            answers[str(q["number"])] = "wrong answer xyz"
    r = client.post(f"{API}/worksheets/{ws['id']}/mark", json={"answers": answers}, timeout=180)
    assert r.status_code == 200, f"mark failed: {r.status_code} {r.text[:500]}"
    j = r.json()
    assert "_id" not in j
    assert j["user_answers"] == answers
    mr = j["marking_result"]
    assert mr is not None
    assert "total_awarded" in mr and "total_out_of" in mr and "percentage" in mr
    assert mr["total_out_of"] == ws["total_marks"]
    assert 0 <= mr["total_awarded"] <= mr["total_out_of"]
    assert isinstance(mr["overall_feedback"], str) and len(mr["overall_feedback"]) > 0
    assert len(mr["per_question"]) == len(ws["questions"])
    for pq in mr["per_question"]:
        assert "awarded" in pq and "out_of" in pq and "feedback" in pq
        assert 0 <= pq["awarded"] <= pq["out_of"]


def test_worksheet_get_returns_marking(client, generated_worksheet):
    r = client.get(f"{API}/worksheets/{generated_worksheet['id']}")
    assert r.status_code == 200
    j = r.json()
    assert j.get("marking_result") is not None
    assert j.get("user_answers")


def test_cleanup(client, created_ids):
    for wid in created_ids["worksheets"]:
        client.delete(f"{API}/worksheets/{wid}")
    for sid in created_ids["sessions"]:
        client.delete(f"{API}/chat/sessions/{sid}")
    for sid in created_ids["subjects"]:
        client.delete(f"{API}/subjects/{sid}")
