# MediSync – Offline Drug Interaction Checker

An offline, graph-based clinical decision support system that detects drug–drug interactions, contraindications, and dosage risks with explainable severity scoring.

---

## 1. Problem Statement

**Problem Title**  
Drug Interaction Detection for Resource-Constrained Healthcare

**Problem Description**  
Polypharmacy significantly increases the risk of adverse drug interactions, contraindications, and dosage conflicts. While large hospitals use integrated clinical decision systems, small clinics and rural healthcare setups lack accessible, structured, offline tools to evaluate medication conflicts quickly and safely. Manual checking through textbooks or fragmented digital sources increases prescription errors and delays treatment decisions.

**Target Users**
- Small clinic doctors
- Rural healthcare practitioners
- Pharmacists
- Medical interns
- Primary Health Centers (PHCs)

**Existing Gaps**
- No lightweight offline interaction checker
- Manual cross-referencing of drugs
- Alert fatigue in large EMR systems
- Lack of visual explanation of conflicts
- Limited accessibility in rural areas

---

## 2. Problem Understanding & Approach

**Root Cause Analysis**
- Fragmented drug interaction knowledge
- Lack of structured local database tools
- Heavy enterprise systems inaccessible to small setups
- Overreliance on manual verification

**Solution Strategy**
- Build structured drug knowledge base
- Use graph-based modeling for interactions
- Apply rule-based + AI-assisted scoring
- Ensure fully offline functionality
- Provide explainable output

---

## 3. Proposed Solution

**Solution Overview**  
MediSync is a desktop-based, offline Drug Interaction Checker that identifies medication conflicts and visualizes them using a graph model.

**Core Idea**  
Represent drugs as nodes and interactions as weighted edges. Apply severity-based logic and generate risk scores with clear explanations.

**Key Features**
- ✔ Offline-first system
- ✔ Drug–drug interaction detection
- ✔ Contraindication identification
- ✔ Dosage conflict detection
- ✔ Severity classification (Mild / Moderate / Severe)
- ✔ Graph-based visualization
- ✔ Risk scoring engine
- ✔ Printable safety summary

---

## 4. System Architecture

**High-Level Flow**  
User → Frontend → Backend → Risk Engine → Database → Response

**Architecture Description**
- **Frontend:** User inputs medication list and views conflict graph
- **Backend:** Processes drug list and constructs interaction graph
- **Risk Engine:** Applies rule-based + scoring logic
- **Database:** Local structured drug interaction dataset
- **Response Layer:** Returns severity report + visualization data

**Architecture Diagram**  
*(Add system architecture diagram image here)*

---

## 5. Database Design

**ER Diagram**  
*(Add ER diagram image here)*

**ER Diagram Description**
- **Entities:** Drug, Interaction, Contraindication, DosageLimit
- **Relationships:**
  - Drug ↔ Interaction (Many-to-Many)
  - Drug → Contraindication (One-to-Many)
  - Drug → DosageLimit (One-to-One)

---

## 6. Dataset Selected

**Dataset Name**  
Drug-Drug Interactions (Kaggle)

**Source**  
[mghobashy/drug-drug-interactions](https://www.kaggle.com/datasets/mghobashy/drug-drug-interactions)

**Data Type**
- Drug names (`drug_1`, `drug_2`)
- Severity (Mild / Moderate / Severe)
- Interaction description

**Selection Reason**
- Structured format
- Lightweight for offline use
- Sufficient for MVP implementation
- Open-access public resource

**Preprocessing Steps**
- Normalization of drug names
- Severity inference from description text (Mild / Moderate / Severe)
- Removal of duplicate interaction entries
- **Curated subset:** A curated subset of the Kaggle Drug-Drug Interaction dataset was structured into an optimized O(1) lookup map to enable efficient offline conflict detection. Keeps 5k–20k interactions with mixed severity and common drugs—reduces repo size, enables instant lookup, no full-table scan.

```bash
# Load dataset and export optimized JSON map to data/
pip install -r requirements.txt
python scripts/load_dataset.py
```

**Output Format** (O(1) lookup, ~3MB):
```json
{
  "Aspirin": {
    "Warfarin": { "severity": "Severe", "description": "Increased bleeding risk..." }
  }
}
```

---

## 7. Model Selected

**Model Name**  
Hybrid Rule-Based + Risk Scoring Engine

**Selection Reasoning**
- Medical domain requires explainability
- Deterministic decision logic preferred
- Hackathon time constraints

**Alternatives Considered**
- Full ML classification model
- Deep learning interaction prediction
- Black-box neural network system  
*Rejected due to lack of interpretability and dataset limitations.*

**Evaluation Metrics**
- Interaction detection accuracy
- Severity classification consistency
- Response time
- System reliability

---

## 8. Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React, Tailwind CSS, React Flow (graph visualization) |
| **Backend** | Node.js / FastAPI |
| **ML/AI** | Python, risk scoring formula, optional NLP parsing module |
| **Database** | SQLite / JSON (offline) |
| **Deployment** | Desktop-based application, localhost server |

---

## 9. API Documentation & Testing

**API Endpoints List**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /check-interactions` | POST | Input: drug list → Output: interaction report + severity |
| `GET /drug/{name}` | GET | Returns drug metadata |
| `GET /health` | GET | System health check |

**API Testing Screenshots**  
*(Add Postman / Thunder Client screenshots here)*

**Testing the backend (local)**  
- Run automated tests: `python tests/test_interaction_checker.py` — all 8 test groups should **PASS**.  
- See example inputs/outputs: `python tests/example_runs.py`.  
- Quick check: `python -m backend.interaction_checker Ibuprofen Warfarin Digoxin` — should print JSON with `pair_results`, `total_score`, `moderate_count`, `overall_risk`.

---

## 10. Module-wise Development & Deliverables

| Checkpoint | Deliverables |
|------------|--------------|
| **Checkpoint 1: Research & Planning** | Problem analysis, system design, dataset structuring |
| **Checkpoint 2: Backend Development** | Interaction detection engine, API endpoints, risk scoring logic |
| **Checkpoint 3: Frontend Development** | Drug input interface, conflict visualization, severity display |
| **Checkpoint 4: Model Training** | Risk scoring model calibration, NLP parser implementation |
| **Checkpoint 5: Model Integration** | Backend + ML integration, real-time interaction detection |
| **Checkpoint 6: Deployment** | Local deployment, demo-ready system |

---

## 11. End-to-End Workflow

1. User inputs medications  
2. Backend fetches drug data  
3. Interaction graph constructed  
4. Severity scoring applied  
5. Conflict graph generated  
6. Report displayed to user  

---

## 12. Demo & Video

- **Live Demo Link:**  
- **Demo Video Link:**  
- **GitHub Repository:**  

---

## 13. Hackathon Deliverables Summary

- ✔ Working offline prototype
- ✔ Graph-based interaction model
- ✔ Risk scoring engine
- ✔ Clean UI
- ✔ API documentation
- ✔ Architecture documentation

---

## 14. Team Roles & Responsibilities

| Member Name | Role | Responsibilities |
|-------------|------|------------------|
| Akanksha | Team Lead | Architecture design, backend logic |
|  | Frontend Dev | UI + graph visualization |
| Pushkar Sharma | ML Engineer | Risk scoring + NLP module |

---

## 15. Future Scope & Scalability

**Short-Term**
- Larger drug database
- Age-based risk modeling
- PDF prescription integration

**Long-Term**
- EMR integration
- Patient-specific lab analysis
- ML-based unknown interaction prediction
- National drug database sync

---

## 16. Known Limitations

- Limited MVP drug dataset
- Not a replacement for clinical judgment
- No real patient lab parameter integration

---

## 17. Impact

- Reduces medication errors
- Improves prescription safety
- Supports rural healthcare digitization
- Enhances clinical confidence
- Promotes explainable AI in healthcare
