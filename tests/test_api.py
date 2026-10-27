import json

from api.index import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health_and_catalog():
    assert client.get("/api/py/health").json()["status"] == "ok"
    assert "DE" in client.get("/api/py/catalog").json()["roles"]
    assert len(client.get("/api/py/agents").json()) == 6


def test_run_requires_key_unless_demo(demo_wbs):
    res = client.post("/api/py/runs", data={"settings": "{}"}, files={"wbs": ("w.xlsx", demo_wbs)})
    assert res.status_code == 400


def test_demo_run_recalculate_and_excel():
    res = client.post("/api/py/runs", data={"settings": json.dumps({"demo": True})})
    lines = [json.loads(line) for line in res.text.splitlines() if line]
    assert lines[-1]["type"] == "result"
    run = lines[-1]["run"]
    run["breakdown"][0]["allocation_fte"] = 2.0
    again = client.post("/api/py/recalculate", json={"run": run}).json()
    assert again["estimates"] != run["estimates"]
    xlsx = client.post("/api/py/excel", json={"run": again})
    assert xlsx.status_code == 200 and xlsx.content[:2] == b"PK"


def test_wbs_preview(demo_wbs):
    body = client.post("/api/py/wbs/preview", files={"file": ("w.xlsx", demo_wbs)}).json()
    assert body["items"] == 23 and body["start"] == "2027-02-01"


def test_demo_ignores_period_from_the_form():
    settings = {"demo": True, "project": {"start": "2026-10-01", "end": "2027-01-31"}}
    res = client.post("/api/py/runs", data={"settings": json.dumps(settings)})
    run = json.loads(res.text.splitlines()[-1])["run"]
    assert run["project"]["start"] == "2027-02-01"
    assert [m["month"][:7] for m in run["monthly"]] == ["2027-02", "2027-03", "2027-04"]
    assert not any(f["kind"] == "data_quality" for f in run["findings"])


def test_catalog_excel_download():
    res = client.post("/api/py/catalog/excel", json={})
    assert res.status_code == 200 and res.content[:2] == b"PK"
    parsed = client.post(
        "/api/py/catalog/parse", files={"file": ("katalog.xlsx", res.content)}
    ).json()
    assert set(parsed["roles"]) == {"DE", "DA", "DS", "AI", "UXR", "UX", "UI"}


def test_preview_several_wbs_files_prefixes_clashing_ids(demo_wbs):
    files = [("file", ("Tim_A.xlsx", demo_wbs)), ("file", ("Tim_B.xlsx", demo_wbs))]
    body = client.post("/api/py/wbs/preview", files=files).json()
    assert body["items"] == 46
    assert [f["name"] for f in body["files"]] == ["Tim_A.xlsx", "Tim_B.xlsx"]
    assert any("awalan" in w for w in body["warnings"])


def test_run_with_several_documents(demo_wbs):
    files = [
        ("wbs", ("w.xlsx", demo_wbs)),
        ("request_doc", ("a.txt", b"Permintaan: 1 Data Engineer")),
        ("request_doc", ("b.txt", b"Tambahan: 0,5 FTE Data Analyst")),
    ]
    settings = {"demo": True, "project": {"scope": "data"}}
    res = client.post("/api/py/runs", data={"settings": json.dumps(settings)}, files=files)
    run = json.loads(res.text.splitlines()[-1])["run"]
    requested = {r["role"]: r["requested_fte"] for r in run["role_inputs"]}
    assert requested["DE"] == 1.0 and requested["DA"] == 0.5


def test_too_many_files(demo_wbs):
    files = [("wbs", (f"w{i}.xlsx", demo_wbs)) for i in range(6)]
    res = client.post("/api/py/runs", data={"settings": json.dumps({"demo": True})}, files=files)
    assert res.status_code == 400


def test_stream_sends_heartbeats_while_waiting(monkeypatch):
    import asyncio

    import api.index as api_module

    async def slow_pipeline(inputs, llm):
        await asyncio.sleep(0.2)
        yield {"type": "result", "run": {}}

    monkeypatch.setattr(api_module, "HEARTBEAT_S", 0.05)
    monkeypatch.setattr(api_module, "run_pipeline", slow_pipeline)
    res = client.post("/api/py/runs", data={"settings": json.dumps({"demo": True})})
    kinds = [json.loads(line)["type"] for line in res.text.splitlines() if line]
    assert "heartbeat" in kinds and kinds[-1] == "result"
