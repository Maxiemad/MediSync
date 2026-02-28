"""
MediSync FastAPI – HTTP API layer.

Endpoints:
- POST /check-interactions  (drug list → interaction report)
- GET  /drug/{name}         (drug metadata)
- GET  /health              (health check)
"""

import os

from dotenv import load_dotenv
load_dotenv()
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.interaction_checker import (
    check_drug_interactions,
    get_cached_data,
    init_interaction_data,
)
from backend.dosage_contraindications import init_dosage_contraindications

# API key for authentication (set via env var or use default for demo)
API_KEY = os.getenv("MEDISYNC_API_KEY", "medisync-demo-key-2024")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload dataset at startup."""
    init_interaction_data()
    init_dosage_contraindications()
    yield


app = FastAPI(
    title="MediSync API",
    description="Offline Drug Interaction Checker – CDSS",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_api_key(x_api_key: str | None = None) -> None:
    """Raise 401 if API key is missing or invalid."""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


class CheckRequest(BaseModel):
    drugs: list[str]
    drug_doses: list[dict] | None = None   # optional: [{"drug": "Ibuprofen", "daily_mg": 400}]
    patient_context: dict | None = None   # optional: {"pregnancy": true, "severe_liver_impairment": true}


class CheckResponse(BaseModel):
    pass  # Dynamic JSON response


@app.get("/")
async def root():
    """Root – API info and links."""
    return {
        "service": "MediSync API",
        "docs": "/docs",
        "health": "/health",
        "message": "Use the frontend at http://localhost:5173 or call POST /check-interactions with X-API-Key.",
    }


@app.get("/health")
async def health():
    """Health check – no auth required."""
    return {"status": "ok", "service": "MediSync"}


@app.post("/check-interactions", response_model=None)
async def check_interactions(
    body: CheckRequest,
    x_api_key: Annotated[str | None, Header()] = None,
):
    """
    Check drug interactions for a list of drugs (2–10).
    Returns pair_results, graph_data, overall_risk, etc.
    """
    verify_api_key(x_api_key)
    result = check_drug_interactions(
        body.drugs,
        drug_doses=body.drug_doses,
        patient_context=body.patient_context,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/drug/{name}", response_model=None)
async def get_drug(
    name: str,
    x_api_key: Annotated[str | None, Header()] = None,
):
    """
    Get drug metadata (exists in DB, interaction count).
    """
    verify_api_key(x_api_key)
    interactions, lower_to_canonical = get_cached_data()
    canonical = lower_to_canonical.get(name.strip().lower())
    if canonical is None:
        raise HTTPException(status_code=404, detail="Drug not found in database")
    interaction_count = len(interactions.get(canonical, {}))
    return {
        "name": canonical,
        "in_database": True,
        "interaction_count": interaction_count,
    }


# Severity color map for frontend (same as backend – 3 classes only)
SEVERITY_COLORS = {
    "Mild": "#22c55e",
    "Moderate": "#f59e0b",
    "Severe": "#ef4444",
    "Unknown": "#6b7280",
}


@app.get("/check-pair", response_model=None)
async def check_pair(
    drug1: str,
    drug2: str,
    x_api_key: Annotated[str | None, Header()] = None,
):
    """
    Interactive: check single pair drug1 + drug2. Returns interaction if found, else Unknown.
    Use for quick lookup when user selects two drugs.
    """
    verify_api_key(x_api_key)
    result = check_drug_interactions([drug1.strip(), drug2.strip()])
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    # Return the single pair result (drug1, drug2 order normalized)
    pair_results = result["pair_results"]
    if len(pair_results) != 1:
        raise HTTPException(status_code=400, detail="Exactly two drugs required")
    pr = pair_results[0]
    return {
        "drugA": pr["drugA"],
        "drugB": pr["drugB"],
        "severity": pr["severity"],
        "severity_score": pr.get("severity_score"),
        "description": pr["description"],
        "color": SEVERITY_COLORS.get(pr["severity"], SEVERITY_COLORS["Unknown"]),
        "interaction_found": pr["severity"] != "Unknown",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
