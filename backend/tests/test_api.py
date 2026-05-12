import pytest
from fastapi.testclient import TestClient

import main as api


@pytest.fixture()
def client(monkeypatch):
    async def _noop():
        return None

    monkeypatch.setattr(api, "warmup_embedding_model", _noop)
    monkeypatch.setattr(api, "collection_count", lambda: 0)
    monkeypatch.setattr(
        api,
        "ingest_document",
        lambda content, filename: {
            "filename": filename,
            "chunks_stored": 1,
            "chunks_skipped": 0,
        },
    )
    monkeypatch.setattr(api, "persist_upload_copy", lambda content, filename: "stored.txt")

    def _fake_eval(*, question_runner, output_csv):
        return {
            "summary": {
                "context_precision": 0.0,
                "faithfulness": 0.0,
                "answer_relevancy": 0.0,
            },
            "cases": [],
            "output_csv": str(output_csv),
        }

    monkeypatch.setattr(api, "run_medrag_evaluation", _fake_eval)

    with TestClient(api.app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "collection_count" in payload


def test_ingest_upload_happy_path(client):
    response = client.post(
        "/api/ingest/upload",
        files={"file": ("sample.txt", b"hello medrag", "text/plain")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == "sample.txt"
    assert payload["chunks_stored"] == 1
    assert "stored_file" in payload


def test_run_evaluation_contract(client):
    response = client.post("/api/evaluation/run", json={})
    assert response.status_code == 200
    payload = response.json()
    assert "summary" in payload
    assert "cases" in payload
    assert "output_csv" in payload
