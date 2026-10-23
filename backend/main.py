import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional

from backend.config import OLLAMA_MODEL, OLLAMA_BASE_URL, is_key_configured, get_masked_key, HOST, PORT
from backend.models import (
    Skill, SkillCreateRequest, SkillImproveRequest, ExecutionRun,
    CustomExecutionRequest, CustomExecutionResponse, SaveTestCaseRequest,
    TestCase, TestAssertion, AppSettings
)
from backend.llm_client import verify_gemma_connection
from backend.registry import registry, get_app_settings, save_app_settings
from backend.executors.restricted_python import run_restricted_python
from backend.executors.evaluator import evaluate_assertion
from backend.orchestrator import (
    run_skill_creation_workflow, step_execute_test_suite, step_diagnose_and_improve,
    run_autonomous_evolution_loop
)
from backend.seed_data import populate_seed_skills

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    populate_seed_skills()
    yield

app = FastAPI(
    title="SkillSmith AI Engine",
    description="Universal AI Skill Creation, Execution, Testing, and Self-Improvement Platform powered by Gemma on Ollama Cloud",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local React/Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SkillSmith AI Core",
        "provider": "Ollama Cloud",
        "model": OLLAMA_MODEL,
        "key_configured": is_key_configured(),
        "key_masked": get_masked_key(),
        "provider_endpoint": OLLAMA_BASE_URL
    }

@app.get("/api/model/verify")
async def verify_model_endpoint():
    """Real live connection check to Ollama Cloud Gemma without revealing secrets."""
    result = await verify_gemma_connection()
    return result

@app.get("/api/skills", response_model=List[Skill])
async def list_skills():
    return registry.list_all()

@app.get("/api/skills/{skill_id}", response_model=Skill)
async def get_skill(skill_id: str):
    skill = registry.get(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill

@app.post("/api/skills/generate", response_model=Skill)
async def generate_skill(req: SkillCreateRequest):
    """
    Executes the End-to-End Skill Generation Pipeline:
    Analyze -> Architect -> Test Gen -> Sandbox Execution -> Validation -> Feedback Descent -> Version Snapshot
    """
    try:
        skill = await run_skill_creation_workflow(
            user_req=req.user_requirement,
            category_hint=req.category,
            auto_improve=True
        )
        return skill
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Skill generation pipeline failed: {str(e)}"
        )

@app.get("/api/settings", response_model=AppSettings)
async def get_settings():
    return get_app_settings()

@app.post("/api/settings", response_model=AppSettings)
async def update_settings(settings: AppSettings):
    save_app_settings(settings)
    return settings

@app.post("/api/skills/{skill_id}/execute", response_model=CustomExecutionResponse)
async def execute_skill_custom(skill_id: str, req: CustomExecutionRequest):
    """
    Executes a skill with arbitrary user inputs in the safe AST sandbox.
    Optionally compares against expected_output.
    """
    skill = registry.get(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    target_ver = req.version or skill.current_version
    ver_obj = skill.versions.get(target_ver)
    if not ver_obj or not ver_obj.code:
        raise HTTPException(status_code=400, detail=f"No executable code found for version {target_ver}")

    if not isinstance(req.inputs, dict):
        raise HTTPException(status_code=400, detail="Inputs must be a valid JSON dictionary")

    success, output, logs, ms = run_restricted_python(ver_obj.code, req.inputs)

    matches_expected = None
    comp_details = None
    if req.expected_output is not None:
        if success and output is not None:
            assertion = TestAssertion(assertion_type="equals", expected=req.expected_output)
            passed, msg = evaluate_assertion(assertion, output)
            matches_expected = passed
            comp_details = msg
        else:
            matches_expected = False
            comp_details = f"Execution failed or produced no output: {logs or 'Error'}"

    return CustomExecutionResponse(
        success=success,
        output=output,
        error=logs if not success else None,
        logs=logs,
        execution_time_ms=round(ms, 2),
        version=target_ver,
        matches_expected=matches_expected,
        comparison_details=comp_details
    )

@app.post("/api/skills/{skill_id}/test-cases", response_model=TestCase)
async def add_skill_test_case(skill_id: str, req: SaveTestCaseRequest):
    """Saves a custom execution as a persistent test case attached to the skill."""
    skill = registry.get(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    if not isinstance(req.input_data, dict):
        raise HTTPException(status_code=400, detail="input_data must be a valid JSON dictionary")

    assertions = []
    if req.expected_output is not None:
        assertions.append(TestAssertion(
            assertion_type=req.assertion_type or "equals",
            expected=req.expected_output,
            target_field=req.target_field
        ))
    else:
        assertions.append(TestAssertion(
            assertion_type="not_empty",
            expected=True
        ))

    tc = TestCase(
        id=str(uuid.uuid4())[:8],
        name=req.name or f"Custom Test Case #{len(skill.test_cases) + 1}",
        description=req.description or "User custom execution saved as test case",
        input_data=req.input_data,
        expected_behavior=req.expected_behavior or "Returns expected result for custom inputs",
        assertions=assertions,
        is_edge_case=req.is_edge_case
    )

    skill.test_cases.append(tc)
    registry.save(skill)
    return tc

@app.post("/api/skills/{skill_id}/test", response_model=ExecutionRun)
async def run_skill_tests(skill_id: str, version: str = None, auto_evolve: Optional[bool] = Query(None)):
    """
    Executes the test suite against a specific skill version in the sandbox.
    If auto_evolve is enabled (or global setting is active), automatically triggers
    the Feedback Descent evolution loop on failure without overwriting if candidates regress.
    """
    skill = registry.get(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    target_ver = version or skill.current_version
    ver_obj = skill.versions.get(target_ver)
    if not ver_obj or not ver_obj.code:
        raise HTTPException(status_code=400, detail=f"No executable code found for version {target_ver}")

    run = step_execute_test_suite(ver_obj.code, skill.test_cases, skill.id, target_ver)
    ver_obj.latest_run = run
    skill.runs.append(run)
    registry.save(skill)

    # Check whether autonomous evolution is active
    settings = get_app_settings()
    should_auto_evolve = auto_evolve if auto_evolve is not None else settings.auto_evolve_on_failure

    if should_auto_evolve and run.failed_count > 0:
        await run_autonomous_evolution_loop(
            skill=skill,
            baseline_run=run,
            max_iterations=settings.max_evolution_iterations
        )
        # Return the latest run of the active version
        active_ver = skill.versions.get(skill.current_version)
        if active_ver and active_ver.latest_run:
            return active_ver.latest_run

    return run

@app.post("/api/skills/{skill_id}/improve", response_model=Skill)
async def improve_skill(skill_id: str):
    """
    Triggers the Improvement Agent and Feedback Descent on current failures.
    Preserves last known-good version: ONLY promotes candidate if acceptance criteria are met
    and no regressions are introduced.
    """
    skill = registry.get(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    cur_ver = skill.versions.get(skill.current_version)
    if not cur_ver or not cur_ver.latest_run:
        raise HTTPException(status_code=400, detail="Cannot improve skill without prior test run execution")

    if len(skill.improvements) >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 improvement iterations reached per skill lifecycle.")

    candidate_ver, imp_rec = await step_diagnose_and_improve(skill, cur_ver, cur_ver.latest_run)
    skill.versions[candidate_ver.version] = candidate_ver
    skill.runs.append(candidate_ver.latest_run)
    skill.improvements.append(imp_rec)

    # ONLY promote if accepted by acceptance criteria and regression gate
    if imp_rec.decision == "accepted":
        skill.current_version = candidate_ver.version

    registry.save(skill)
    return skill

@app.delete("/api/skills/{skill_id}")
async def delete_skill(skill_id: str):
    success = registry.delete(skill_id)
    if not success:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"status": "deleted", "skill_id": skill_id}

@app.get("/api/skills/{skill_id}/export")
async def export_skill_artifact(skill_id: str):
    skill = registry.get(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    cur_ver = skill.versions.get(skill.current_version)
    return {
        "id": skill.id,
        "name": skill.name,
        "version": skill.current_version,
        "skill_md": cur_ver.skill_md if cur_ver else "",
        "manifest": cur_ver.manifest if cur_ver else None,
        "code": cur_ver.code if cur_ver else "",
        "test_cases": skill.test_cases,
        "latest_run": cur_ver.latest_run if cur_ver else None,
        "improvements": skill.improvements
    }

from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Serve compiled frontend if present
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
