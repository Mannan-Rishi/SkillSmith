# ⚡ SkillSmith AI

## Universal Autonomous AI Skill Creation, Execution & Self‑Evolution Platform

![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg?logo=fastapi&logoColor=white)
![React | TypeScript | Vite](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Vite-61DAFB.svg?logo=react&logoColor=black)
![LLM – Gemma 4 (31B) via Ollama Cloud](https://img.shields.io/badge/LLM-Gemma%204%20(31B)%20via%20Ollama%20Cloud-818cf8.svg?logo=ollama&logoColor=white)
![Sandbox – AST‑Guarded Isolation](https://img.shields.io/badge/Sandbox-AST%20Guarded%20Isolation-emerald.svg)
![Tests – 32 Passing (100 %)](https://img.shields.io/badge/Tests-32%20Passing%20(100%25)-success.svg)
![License – MIT](https://img.shields.io/badge/License-MIT-purple.svg)

---

### 📢 What is SkillSmith?
SkillSmith is **not** a simple prompt generator. It is an end‑to‑end platform that:

1. **Generates** a reusable skill specification (`SKILL.md`).
2. **Creates** executable Python adapters (restricted‑Python sandbox).
3. **Synthesizes** adversarial test suites.
4. **Executes** the skill inside a hardened sandbox, measures latency, and captures structured output.
5. **Evaluates** results with a type‑aware assertion engine.
6. **Diagnoses** failures, generates candidate patches, and **automatically evolves** the skill only when zero regressions are guaranteed.

All of this is driven by **Gemma 4 (31 B)** on **Ollama Cloud**, with strict security controls that never expose API keys or allow arbitrary system access.

---

## 📖 Table of Contents
- [Why SkillSmith?](#-why-skillsmith)
- [Architecture & Workflow](#-architecture--workflow)
- [Core Features](#-core-features)
- [Quick Start](#-quick-start)
- [Pre‑Built Skills Catalog](#-pre‑built-skills-catalog)
- [Security & Sandbox Isolation](#-security--sandbox-isolation)
- [Verification & Test Suite](#-verification--test-suite)
- [Deploy to Vercel](#-deploy-to-vercel)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Why SkillSmith?
Most AI‑agent frameworks generate code that looks plausible **but crashes at runtime**. SkillSmith bridges that gap by **verifying** every generated skill before it becomes part of the production catalog.

- **Evidence‑Driven Verification** – every skill is run against a full regression suite; no silent failures.
- **Zero‑Regression Gate** – candidate patches are rejected if any existing test regresses.
- **AST‑Guarded Sandbox** – strict import / function whitelist, 3 s hard timeout, and captured stdout/stderr.
- **Universal Domain Flexibility** – from PII masking to code‑complexity analysis, any computational task can be expressed as a skill.

---

## 🏛️ Architecture & Workflow
```mermaid
flowchart TD
    User([User Requirement]) --> Orch[Orchestrator]
    subgraph Multi‑Agent Studio
        Orch --> Req[Requirement Analyst]
        Req --> Arch[Skill Architect (Gemma 4 31B)]
        Arch --> GenCode[Executable Adapter + SKILL.md]
        Arch --> Tester[Adversarial Tester]
        Tester --> GenTests[Synthesized Tests]
    end
    subgraph Sandbox Runtime
        GenCode --> ASTCheck{AST Safety Validator}
        ASTCheck -->|Blocked| Security[Security Rejection]
        ASTCheck -->|Passed| ExecSandbox[Restricted Python Sandbox]
        GenTests --> ExecSandbox
        ExecSandbox --> Evaluator[Assertion Engine]
    end
    subgraph Evolution Engine
        Evaluator -->|All Pass| Catalog[Production Catalog]
        Evaluator -->|Failure| Diagnostician[Root‑Cause Diagnostician]
        Diagnostician --> CandidateGen[Generate Candidate Patch]
        CandidateGen --> RegressionGate{0 Regressions?}
        RegressionGate -->|No| Rollback[Reject Candidate]
        RegressionGate -->|Yes| Promote[Promote Candidate]
        Promote --> Catalog
    end
``` 

---

## 🎯 Core Features
### 1. Interactive **"Try Skill"** Runner
- JSON‑schema aware input editor.
- Real‑time execution via the restricted sandbox.
- Shows structured output, latency, and error details.
- Optional *expected output* comparison.
- One‑click **save as test case** for later regression testing.

### 2. Autonomous Feedback Descent
- Automatic diagnosis of failed assertions.
- Candidate generation via Gemma.
- Re‑run the **exact baseline suite** against the candidate.
- Promotion only on **zero regressions**.
- Optional **Auto‑Evolve on Test Failure** toggle (disabled by default).

### 3. Type‑Aware Assertion Engine
- `equals`, `contains`, `numeric_range`, `length`, `regex`, `has_key`.
- Dot‑path / array‑path look‑ups (`user.address.city`).
- Graceful handling of mismatched types.

### 4. Responsive UI
- Collapsible test cards, expandable JSON viewers, copy‑to‑clipboard buttons.
- Clear badges for runtime errors vs. assertion failures.

---

## 🚀 Quick Start
```bash
# Clone the repo
git clone https://github.com/Mannan-Rishi/SkillSmith.git
cd SkillSmith

# Backend dependencies
python -m pip install -r requirements.txt

# Frontend (optional – Vercel handles builds automatically)
cd frontend && npm install && npm run build && cd ..

# Create .env (replace with your Ollama key)
cat > .env <<EOF
OLLAMA_API_KEY=your_ollama_api_key_here
OLLAMA_BASE_URL=https://ollama.com/v1
OLLAMA_MODEL=gemma4:31b
HOST=127.0.0.1
PORT=8000
EOF

# Run the application locally
python run_app.py
```
Open **http://localhost:8000** in a browser.

---

## 📦 Pre‑Built Skills Catalog
| Skill | Category | Version | Pass Rate |
|---|---|---|---|
| AI Study Notes Analyzer | Education & Productivity | v1.0.1 | 100 % (4/4) |
| Python Code Bug Detector | Developer Tools | v1.0.1 | 100 % (5/5) |
| ... (full list in [`SKILLS.md`](SKILLS.md)) |

---

## 🔒 Security & Sandbox Isolation
| Category | Allowed | Blocked |
|---|---|---|
| **Modules** | `math`, `json`, `datetime`, `re`, `ast` *(static parsing only)* | `os`, `subprocess`, `socket`, `requests`, … |
| **Functions** | `len`, `range`, `print` *(captured)* | `open`, `exec`, `eval`, … |
| **Timeout** | **3 s** hard limit | — |

---

## 🧪 Verification & Test Suite
```bash
python -m unittest discover tests
```
```
Ran 32 tests in 4.5s
OK
```
All core features are covered, including the new **Try Skill** runner and the auto‑evolution gate.

---

## 🌐 Deploy to Vercel
1. **Push** the latest commit (already done).
2. In the Vercel dashboard click **"New Project" → Import Git Repository** and select `Mannan‑Rishi/SkillSmith`.
3. Vercel will detect the `vercel.json` configuration.
4. Add the following **Environment Variables** (Project Settings → Environment Variables):
   - `OLLAMA_API_KEY` – your Ollama Cloud key (‑‑> **Server‑Side Only**).
   - `OLLAMA_BASE_URL` – `https://ollama.com/v1`
   - `OLLAMA_MODEL` – `gemma4:31b`
5. Deploy. Vercel will:
   - Run `npm install && npm run build` for the frontend.
   - Deploy the FastAPI serverless function from `api/index.py`.
6. Once deployed, visit the generated Vercel URL. All UI features, including the **Try Skill** runner, work identically to the local version.

---

## 🤝 Contributing
1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/awesome‑skill`).
3. Make your changes, run the test suite, and commit.
4. Push and open a Pull Request.
5. Ensure **all tests pass** before merging.

---

## 📄 License
Distributed under the **MIT License**. See [`LICENSE`](LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Mannan-Rishi">Mannan‑Rishi</a> using Google Gemma & Ollama Cloud.</sub>
</div>
