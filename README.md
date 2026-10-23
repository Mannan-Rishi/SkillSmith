# SkillSmith AI — Universal Autonomous Skill Platform

SkillSmith AI is a universal AI skill creation, execution, testing, and self-improvement platform powered by **Gemma on Ollama Cloud**.

A user describes a capability in natural language. The system creates a reusable skill specification (`SKILL.md`), synthesizes adversarial test cases, executes the skill inside an isolated AST Python sandbox, measures actual outcomes, diagnoses failures via **Feedback Descent**, and generates a verifiable, non-regressive improvement.

---

## 🚀 Quick Start (Demo in 60 Seconds)

### 1. Prerequisites & Installation
- Python 3.10+
- Node.js 18+

Install backend dependencies:
```bash
pip install -r requirements.txt
```

### 2. Configure Your Ollama Cloud API Key
Copy the example environment configuration:
```bash
cp .env.example .env
```
Open `.env` and set your `OLLAMA_API_KEY`:
```ini
OLLAMA_API_KEY=your_ollama_api_key_here
OLLAMA_BASE_URL=https://ollama.com/v1
OLLAMA_MODEL=gemma4:31b
HOST=127.0.0.1
PORT=8000
```
*(Your secret key is never committed, logged, or sent to frontend code).*

### 3. Launch the Application
```bash
python run_app.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🏛️ Multi-Agent Architecture

SkillSmith organizes 8 specialized agent roles to ensure skills are never assumed to work without measured execution evidence:

1. **Boss / Orchestrator:** Manages state transitions, dispatches subtasks, and limits improvement iterations to 3 to prevent infinite oscillation.
2. **Requirement Analyst:** Uses Gemma to decompose natural language into formal Pydantic input/output schemas and acceptance criteria.
3. **Skill Architect:** Generates reusable `SKILL.md` documents and safe executable Python adapters.
4. **Tool Planner:** Allocates safe runtimes (AST sandbox, tabular CSV analyzer, text processors).
5. **Execution Agent:** Executes skill code in restricted namespaces with hard CPU timeouts.
6. **Adversarial Tester:** Synthesizes boundary tests and adversarial edge cases with explicit assertions.
7. **Improvement Agent:** Ingests execution failure traces and executes the **Feedback Descent** loop to repair bugs.
8. **Validation Agent:** Re-runs regression tests and enforces quality gates before promoting revisions.

---

## 🔒 Security & Sandbox Isolation

- **AST Inspection:** Prohibits dangerous imports (`os`, `sys`, `subprocess`, `socket`, `open`).
- **Restricted Built-ins:** Disables `eval`, `exec`, `__import__`, `globals`, and file descriptors.
- **Execution Budget:** Hard 3-second timeout per test case.
- **Zero Hallucination Guarantee:** Test scores, execution latencies, and pass rates reflect measured execution, not mock data.

---

## 🧪 Running Automated Tests

```bash
python -m unittest tests/test_pipeline.py
python tests/verify_server.py
```
Verification covers:
- Secret redaction and masking
- AST sandbox attack prevention
- Multi-assertion evaluator (`equals`, `contains`, `regex`, `numeric_range`, `has_key`)
- End-to-end skill snapshotting
- Live Ollama Cloud Gemma connection verification
