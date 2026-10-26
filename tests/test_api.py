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
    assert body["items"] == 19 and body["start"] == "2027-02-01"


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
    assert set(parsed["roles"]) == {"DE", "DA", "DS", "AI"}
