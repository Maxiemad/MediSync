"""
MediSync API integration tests.
Run: pytest tests/test_api.py -v
Or:  python tests/test_api.py
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)

API_KEY = "medisync-demo-key-2024"
HEADERS = {"X-API-Key": API_KEY}


def test_health_no_auth():
    """GET /health does not require auth."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_check_interactions_success():
    """POST /check-interactions with valid drugs."""
    r = client.post(
        "/check-interactions",
        json={"drugs": ["Ibuprofen", "Warfarin", "Digoxin"]},
        headers=HEADERS,
    )
    assert r.status_code == 200
    data = r.json()
    assert "pair_results" in data
    assert "graph_data" in data
    assert "overall_risk" in data
    assert "total_pairs" in data


def test_check_interactions_no_auth():
    """POST /check-interactions without API key returns 401."""
    r = client.post(
        "/check-interactions",
        json={"drugs": ["Ibuprofen", "Warfarin"]},
    )
    assert r.status_code == 401


def test_check_interactions_invalid_auth():
    """POST /check-interactions with wrong API key returns 401."""
    r = client.post(
        "/check-interactions",
        json={"drugs": ["Ibuprofen", "Warfarin"]},
        headers={"X-API-Key": "wrong-key"},
    )
    assert r.status_code == 401


def test_check_interactions_drug_not_found():
    """POST /check-interactions with unknown drug returns 400."""
    r = client.post(
        "/check-interactions",
        json={"drugs": ["Ibuprofen", "FakeDrugXYZ"]},
        headers=HEADERS,
    )
    assert r.status_code == 400
    assert "not found" in r.json().get("detail", "").lower()


def test_check_interactions_too_few_drugs():
    """POST /check-interactions with 1 drug returns 400."""
    r = client.post(
        "/check-interactions",
        json={"drugs": ["Ibuprofen"]},
        headers=HEADERS,
    )
    assert r.status_code == 400


def test_get_drug_success():
    """GET /drug/{name} with valid drug."""
    r = client.get("/drug/Ibuprofen", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["in_database"] is True
    assert "name" in data
    assert "interaction_count" in data


def test_get_drug_not_found():
    """GET /drug/{name} with unknown drug returns 404."""
    r = client.get("/drug/FakeDrugXYZ", headers=HEADERS)
    assert r.status_code == 404


def test_get_drug_no_auth():
    """GET /drug/{name} without API key returns 401."""
    r = client.get("/drug/Ibuprofen")
    assert r.status_code == 401


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
