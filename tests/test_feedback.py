import pytest
from api.index import app
from fastapi.testclient import TestClient
from pydantic import BaseModel

from talent_estimation.auth import User, issue_token, read_token
from talent_estimation.feedback import (
    Feedback,
    Guidance,
    GuidedClient,
    MemoryStore,
    heuristic_diagnosis,
)
from talent_estimation.feedback import store as store_module

TEXT = "Estimasi Data Scientist terlalu tinggi, item dashboard seharusnya cukup didukung saja."


def make(text=TEXT, rating="inaccurate", role="DS"):
    return Feedback(
        id="x1",
        created_at="2026-11-20T00:00:00+00:00",
        author="R",
        rating=rating,
        role=role,
        text=text,
    )


def test_token_roundtrip_and_expiry():
    user = User(username="admin", role="admin", name="Admin demo")
    token = issue_token(user, now=1000)
    assert read_token(token, now=1001) == user
    assert read_token(token, now=1000 + 9 * 3600) is None
    assert read_token(token[:-2] + "00", now=1001) is None


def test_heuristic_diagnosis():
    d = heuristic_diagnosis(make())
    assert d.target == "estimator" and d.kind == "prompt_guidance"
    assert "terlalu tinggi" in d.summary and d.proposal.startswith("Untuk role DS")
    assert (
        heuristic_diagnosis(make(text="PHM 15 jam per poin terlalu besar untuk proyek ini")).kind
        == "parameter_change"
    )
    assert heuristic_diagnosis(make(rating="accurate")).kind == "no_change"


class Out(BaseModel):
    ok: bool = True


class Spy:
    def __init__(self):
        self.systems = {}

    async def structured(self, schema, system, user, *, skill):
        self.systems[skill] = system
        return schema()


async def test_guided_client_only_touches_target_skills():
    spy = Spy()
    client = GuidedClient(
        spy,
        [
            Guidance(
                id="g",
                target="estimator",
                text="Cek item dashboard.",
                approved_by="A",
                approved_at=None,
            )
        ],
    )
    await client.structured(Out, "BASE", "u", skill="classify_item")
    await client.structured(Out, "BASE", "u", skill="check_quality")
    assert "Cek item dashboard." in spy.systems["classify_item"]
    assert spy.systems["check_quality"] == "BASE"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(store_module, "_memory", MemoryStore())
    monkeypatch.delenv("KV_REST_API_URL", raising=False)
    monkeypatch.delenv("UPSTASH_REDIS_REST_URL", raising=False)
    monkeypatch.delenv("VERCEL", raising=False)
    return TestClient(app)


def test_feedback_flow(client):
    assert client.get("/api/py/feedback").status_code == 401
    assert (
        client.post(
            "/api/py/auth/login", json={"username": "reviewer", "password": "salah"}
        ).status_code
        == 401
    )

    client.post("/api/py/auth/login", json={"username": "reviewer", "password": "reviewer-demo"})
    created = client.post(
        "/api/py/feedback", json={"rating": "inaccurate", "role": "DS", "text": TEXT}
    ).json()
    assert created["status"] == "pending" and created["diagnosis"]["by"] == "aturan"
    denied = client.post(f"/api/py/feedback/{created['id']}/decision", json={"decision": "approve"})
    assert denied.status_code == 403

    client.post("/api/py/auth/login", json={"username": "admin", "password": "admin-demo"})
    approved = client.post(
        f"/api/py/feedback/{created['id']}/decision", json={"decision": "approve"}
    ).json()
    assert approved["status"] == "approved" and approved["active"] is True
    listing = client.get("/api/py/feedback").json()
    assert listing["storage"] == "memory" and len(listing["guidance"]) == 1

    client.post(f"/api/py/feedback/{created['id']}/decision", json={"decision": "deactivate"})
    assert client.get("/api/py/feedback").json()["guidance"] == []


def test_admin_disabled_on_vercel_without_password(client, monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("DEMO_ADMIN_PASSWORD", raising=False)
    assert client.get("/api/py/auth/me").json()["admin_enabled"] is False
    assert (
        client.post(
            "/api/py/auth/login", json={"username": "admin", "password": "admin-demo"}
        ).status_code
        == 401
    )
