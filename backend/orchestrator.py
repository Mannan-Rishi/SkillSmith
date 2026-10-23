import json
import time
import uuid
from typing import Dict, Any, List, Tuple
from backend.models import (
    Skill, SkillVersion, SkillManifest, TestCase, TestAssertion,
    TestResult, ExecutionRun, ImprovementRecord
)
from backend.llm_client import call_gemma, extract_json_from_response, GemmaClientError
from backend.executors.restricted_python import run_restricted_python
from backend.executors.evaluator import run_test_suite_assertions
from backend.registry import registry

# Agent System Prompts
REQUIREMENT_ANALYST_PROMPT = """You are the Requirement Analyst Agent for SkillSmith AI.
Your job is to decompose the user's natural language request into a precise, domain-agnostic technical specification.
You must respond strictly with a valid JSON object matching this schema:
{
  "skill_name": "Clear, concise name of the skill",
  "slug": "kebab-case-slug",
  "category": "Domain category (e.g., Data Analysis, Quality Assurance, Text Processing, Security, DevOps, Financial)",
  "purpose": "A detailed 1-2 sentence description of what the skill does",
  "inputs": {"field_name": "description and type"},
  "outputs": {"field_name": "description and type"},
  "constraints": ["List of constraints or limitations"],
  "acceptance_criteria": ["List of verifiable criteria for success"]
}
Only output the JSON object."""

SKILL_ARCHITECT_PROMPT = """You are the Skill Architect Agent for SkillSmith AI.
Your job is to design a reusable AI skill based on the technical specification.
You must generate:
1. A structured SKILL.md document following the universal AI skill standard (frontmatter, overview, usage, steps, error handling).
2. A safe, deterministic Python implementation function: `def execute(inputs: dict) -> dict` that fulfills the skill's purpose.
The code must be pure Python and cannot import forbidden libraries (no os, sys, subprocess, network, open).
Allowed libraries: math, re, json, datetime, collections, itertools, string.
Always include needed imports (e.g. `import re`) at the top of the code.
Handle edge cases gracefully: validate input keys, check for None or empty inputs, and return structured dictionary outputs with clean data types.

Respond strictly with a JSON object matching this schema:
{
  "skill_md": "# SKILL.md markdown text with frontmatter",
  "code": "import re\\n\\ndef execute(inputs: dict) -> dict:\\n    # python code implementation\\n    return { ... }",
  "execution_strategy": "restricted_python",
  "safety_requirements": ["Safe AST inspection", "No host file system or network access"]
}
Only output the JSON object."""

TESTER_PROMPT = """You are the Adversarial Tester Agent for SkillSmith AI.
Your job is to generate a comprehensive test suite for the requested skill, including normal cases, boundary conditions, and adversarial edge cases.
Each test case must include explicit input values and assertions.

Assertion types available:
- "contains": expected substring or element in list
- "equals": exact value match
- "not_empty": output is not null/empty
- "regex": regex pattern match
- "numeric_range": [min, max] list for numbers
- "has_key": dictionary key existence

CRITICAL: When the skill returns a dictionary, ALWAYS specify `target_field` to point to the exact key (e.g., target_field: "sanitized_text", target_field: "email_count", target_field: "phone_count").

Respond strictly with a JSON object matching this schema:
{
  "test_cases": [
    {
      "name": "Descriptive test case title",
      "description": "What this test validates",
      "input_data": {"input_text": "sample text"},
      "expected_behavior": "What the skill should produce",
      "is_edge_case": false,
      "assertions": [
        {"assertion_type": "has_key", "expected": "sanitized_text", "target_field": null},
        {"assertion_type": "contains", "expected": "[EMAIL]", "target_field": "sanitized_text"},
        {"assertion_type": "equals", "expected": 2, "target_field": "email_count"}
      ]
    }
  ]
}
Provide between 3 to 5 realistic test cases (with at least 1 edge case). Only output the JSON object."""

IMPROVEMENT_PROMPT = """You are the Improvement Agent for SkillSmith AI, powered by the Feedback Descent algorithm.
A skill version was executed against a test suite and encountered failures or sub-optimal outcomes.
Analyze the failed test cases, execution errors, and assertion mismatches. Propose surgical improvements to both the implementation code and instructions.
Allowed libraries: math, re, json, datetime, collections, itertools, string.
Always include needed imports (e.g. `import re`) at the top of revised_code.
Ensure execute(inputs) handles null/empty/boundary inputs without crashing.

Respond strictly with a JSON object matching this schema:
{
  "failure_analysis": "Detailed diagnosis of why the failures occurred",
  "changes_made": "Specific bug fixes, edge case handlers, or logic adjustments made",
  "revised_skill_md": "# Updated SKILL.md markdown",
  "revised_code": "import re\\n\\ndef execute(inputs: dict) -> dict:\\n    # corrected implementation\\n    return { ... }"
}
Only output the JSON object."""

async def step_analyze_requirement(user_req: str, category_hint: str = None) -> Dict[str, Any]:
    prompt = f"User Request: {user_req}\nOptional Category Hint: {category_hint or 'None'}"
    raw = await call_gemma(prompt, system_prompt=REQUIREMENT_ANALYST_PROMPT, temperature=0.1)
    return extract_json_from_response(raw)

async def step_architect_skill(spec: Dict[str, Any]) -> Dict[str, Any]:
    prompt = f"Specification: {spec}"
    raw = await call_gemma(prompt, system_prompt=SKILL_ARCHITECT_PROMPT, temperature=0.2)
    return extract_json_from_response(raw)

async def step_generate_tests(spec: Dict[str, Any], architect_out: Dict[str, Any]) -> List[TestCase]:
    prompt = f"Skill Spec: {spec}\nImplementation Code:\n{architect_out.get('code', '')}"
    raw = await call_gemma(prompt, system_prompt=TESTER_PROMPT, temperature=0.2)
    parsed = extract_json_from_response(raw)
    
    test_cases = []
    for tc_dict in parsed.get("test_cases", []):
        assertions = [TestAssertion(**a) for a in tc_dict.get("assertions", [])]
        test_cases.append(TestCase(
            id=str(uuid.uuid4())[:8],
            name=tc_dict.get("name", "Unnamed Test"),
            description=tc_dict.get("description", ""),
            input_data=tc_dict.get("input_data", {}),
            expected_behavior=tc_dict.get("expected_behavior", ""),
            assertions=assertions,
            is_edge_case=tc_dict.get("is_edge_case", False)
        ))
    return test_cases

def step_execute_test_suite(code: str, test_cases: List[TestCase], skill_id: str, version: str) -> ExecutionRun:
    """Executes all test cases against the code in the restricted Python sandbox."""
    test_results = []
    logs = []
    passed_count = 0
    failed_count = 0

    logs.append(f"Starting test execution for skill '{skill_id}' (version {version}) with {len(test_cases)} tests.")

    for tc in test_cases:
        success, output, exec_logs, elapsed_ms = run_restricted_python(code, tc.input_data)
        
        if not success:
            test_results.append(TestResult(
                test_id=tc.id,
                test_name=tc.name,
                passed=False,
                actual_output=output,
                error_message=exec_logs,
                execution_time_ms=elapsed_ms,
                assertion_results=[]
            ))
            failed_count += 1
            logs.append(f"[-] Test '{tc.name}' FAILED due to execution error: {exec_logs}")
        else:
            # Check assertions
            all_passed, assertion_evals = run_test_suite_assertions(tc.assertions, output)
            if all_passed:
                passed_count += 1
                logs.append(f"[+] Test '{tc.name}' PASSED in {elapsed_ms:.1f}ms")
            else:
                failed_count += 1
                logs.append(f"[-] Test '{tc.name}' FAILED assertions: {[a['message'] for a in assertion_evals if not a['passed']]}")

            test_results.append(TestResult(
                test_id=tc.id,
                test_name=tc.name,
                passed=all_passed,
                actual_output=output,
                error_message=None if all_passed else "Assertion failures",
                execution_time_ms=elapsed_ms,
                assertion_results=assertion_evals
            ))

    total = len(test_cases)
    pass_rate = round((passed_count / total * 100), 1) if total > 0 else 0.0
    status = "passed" if failed_count == 0 else "failed"

    return ExecutionRun(
        skill_id=skill_id,
        version=version,
        timestamp=time.time(),
        status=status,
        passed_count=passed_count,
        failed_count=failed_count,
        total_tests=total,
        pass_rate=pass_rate,
        test_results=test_results,
        logs=logs
    )

def evaluate_candidate_evolution(
    baseline_run: ExecutionRun,
    candidate_run: ExecutionRun
) -> Tuple[bool, bool, str, List[str], List[str]]:
    """
    Compares baseline test outcomes with candidate test outcomes.
    Returns: (accepted: bool, regression_detected: bool, decision_reason: str, fixed_tests: List[str], regressed_tests: List[str])
    """
    baseline_passed_ids = {tr.test_id for tr in baseline_run.test_results if tr.passed}
    baseline_failed_ids = {tr.test_id for tr in baseline_run.test_results if not tr.passed}
    
    # Tests that failed in baseline but pass in candidate
    fixed_tests = [
        tr.test_name for tr in candidate_run.test_results
        if tr.test_id in baseline_failed_ids and tr.passed
    ]
    
    # Tests that passed in baseline but now fail in candidate
    regressed_tests = [
        tr.test_name for tr in candidate_run.test_results
        if tr.test_id in baseline_passed_ids and not tr.passed
    ]
    
    regression_detected = len(regressed_tests) > 0
    improved = candidate_run.pass_rate > baseline_run.pass_rate or (
        candidate_run.pass_rate == baseline_run.pass_rate == 100.0 and len(fixed_tests) > 0
    )
    
    if regression_detected:
        accepted = False
        decision_reason = (
            f"REJECTED: Candidate introduced {len(regressed_tests)} regression(s) "
            f"in previously passing test(s): {', '.join(regressed_tests)}"
        )
    elif not improved:
        accepted = False
        decision_reason = (
            f"REJECTED: Candidate pass rate ({candidate_run.pass_rate}%) did not exceed "
            f"baseline pass rate ({baseline_run.pass_rate}%)."
        )
    else:
        accepted = True
        decision_reason = (
            f"ACCEPTED: Verified improvement from {baseline_run.pass_rate}% to {candidate_run.pass_rate}% "
            f"with 0 regressions. Fixed {len(fixed_tests)} test(s): {', '.join(fixed_tests)}."
        )
        
    return accepted, regression_detected, decision_reason, fixed_tests, regressed_tests

async def step_diagnose_and_improve(
    skill: Skill,
    current_version: SkillVersion,
    run: ExecutionRun
) -> Tuple[SkillVersion, ImprovementRecord]:
    """Applies Feedback Descent to improve the skill if test failures were recorded."""
    failed_tests = [tr for tr in run.test_results if not tr.passed]
    failure_details = []
    for ft in failed_tests:
        # Match test case to get explicit expected behavior and inputs
        tc_match = next((tc for tc in skill.test_cases if tc.id == ft.test_id), None)
        failure_details.append({
            "test_name": ft.test_name,
            "input_payload": tc_match.input_data if tc_match else {},
            "expected_behavior": tc_match.expected_behavior if tc_match else "",
            "actual_output": ft.actual_output,
            "error_or_issue": ft.error_message,
            "failed_assertions": [a for a in ft.assertion_results if not a.get("passed", True)]
        })

    prompt = f"""
Current Version: {current_version.version}
Code:
```python
{current_version.code}
```
Failed Tests ({len(failed_tests)} out of {run.total_tests}):
{json.dumps(failure_details, indent=2)}

Instructions:
1. Diagnose the verified root cause of each failure.
2. Formulate surgical logic and regex fixes.
3. Return revised executable code and revised SKILL.md.
Ensure you do NOT break existing passing functionality (prevent regressions).
"""
    raw = await call_gemma(prompt, system_prompt=IMPROVEMENT_PROMPT, temperature=0.2)
    parsed = extract_json_from_response(raw)

    v_parts = current_version.version.split(".")
    patch_ver = int(v_parts[-1]) + 1
    new_ver_str = f"{v_parts[0]}.{v_parts[1]}.{patch_ver}"

    new_manifest = current_version.manifest.model_copy(deep=True)
    new_manifest.version = new_ver_str
    new_manifest.parent_version = current_version.version
    new_manifest.code = parsed.get("revised_code", current_version.code)

    candidate_version = SkillVersion(
        version=new_ver_str,
        parent_version=current_version.version,
        manifest=new_manifest,
        skill_md=parsed.get("revised_skill_md", current_version.skill_md),
        code=parsed.get("revised_code", current_version.code),
        created_at=time.time()
    )

    # Retest candidate version against the exact baseline test suite
    retest_run = step_execute_test_suite(candidate_version.code, skill.test_cases, skill.id, candidate_version.version)
    candidate_version.latest_run = retest_run

    # Evaluate acceptance criteria
    accepted, regression_detected, decision_reason, fixed_tests, regressed_tests = evaluate_candidate_evolution(
        baseline_run=run,
        candidate_run=retest_run
    )

    improved = (retest_run.pass_rate > run.pass_rate)

    improvement_rec = ImprovementRecord(
        iteration=len(skill.improvements) + 1,
        previous_version=current_version.version,
        new_version=new_ver_str,
        failure_analysis=parsed.get("failure_analysis", "Failure diagnosed by Improvement Agent"),
        changes_made=parsed.get("changes_made", "Adjusted logic and boundary checks"),
        before_pass_rate=run.pass_rate,
        after_pass_rate=retest_run.pass_rate,
        improved=improved,
        regression_detected=regression_detected,
        decision="accepted" if accepted else "rejected",
        decision_reason=decision_reason,
        fixed_tests=fixed_tests,
        regressed_tests=regressed_tests,
        remaining_issues=[tr.test_name for tr in retest_run.test_results if not tr.passed],
        timestamp=time.time()
    )

    return candidate_version, improvement_rec

async def run_autonomous_evolution_loop(
    skill: Skill,
    baseline_run: ExecutionRun,
    max_iterations: int = 2
) -> List[ImprovementRecord]:
    """
    Executes an autonomous bounded evolution loop if test failures occur.
    Prevents infinite loops and preserves last known-good version if candidates regress.
    """
    evolution_history = []
    current_run = baseline_run
    
    for iter_num in range(max_iterations):
        if current_run.failed_count == 0:
            break
            
        cur_ver = skill.versions.get(skill.current_version)
        if not cur_ver:
            break
            
        candidate_ver, imp_rec = await step_diagnose_and_improve(skill, cur_ver, current_run)
        
        # Save snapshot into skill's version catalog
        skill.versions[candidate_ver.version] = candidate_ver
        skill.runs.append(candidate_ver.latest_run)
        skill.improvements.append(imp_rec)
        evolution_history.append(imp_rec)
        
        if imp_rec.decision == "accepted":
            # Promote candidate to active current version
            skill.current_version = candidate_ver.version
            current_run = candidate_ver.latest_run
        else:
            # Candidate rejected: retain last known-good version as current_version and halt
            break
            
    registry.save(skill)
    return evolution_history

async def run_skill_creation_workflow(user_req: str, category_hint: str = None, auto_improve: bool = True) -> Skill:
    """End-to-End Orchestrator Workflow."""
    # 1. Analyze
    spec = await step_analyze_requirement(user_req, category_hint)
    
    # 2. Architect
    arch_out = await step_architect_skill(spec)
    
    # 3. Generate Tests
    test_cases = await step_generate_tests(spec, arch_out)

    skill_id = f"skill_{str(uuid.uuid4())[:8]}"
    initial_version_str = "1.0.0"

    manifest = SkillManifest(
        name=spec.get("skill_name", "Generated Skill"),
        slug=spec.get("slug", "skill"),
        description=spec.get("purpose", ""),
        category=spec.get("category", "General"),
        version=initial_version_str,
        parent_version=None,
        inputs=spec.get("inputs", {}),
        outputs=spec.get("outputs", {}),
        dependencies=arch_out.get("dependencies", []),
        execution_strategy=arch_out.get("execution_strategy", "restricted_python"),
        safety_requirements=arch_out.get("safety_requirements", []),
        code=arch_out.get("code")
    )

    initial_version = SkillVersion(
        version=initial_version_str,
        parent_version=None,
        manifest=manifest,
        skill_md=arch_out.get("skill_md", "# SKILL.md"),
        code=arch_out.get("code"),
        created_at=time.time()
    )

    # 4. Execute Tests on Initial Version
    initial_run = step_execute_test_suite(initial_version.code, test_cases, skill_id, initial_version_str)
    initial_version.latest_run = initial_run

    skill = Skill(
        id=skill_id,
        name=manifest.name,
        category=manifest.category,
        current_version=initial_version_str,
        versions={initial_version_str: initial_version},
        test_cases=test_cases,
        runs=[initial_run],
        improvements=[],
        created_at=time.time(),
        updated_at=time.time()
    )

    # 5. Improvement Loop if test failures exist and auto_improve enabled
    if auto_improve and initial_run.failed_count > 0:
        new_version, imp_record = await step_diagnose_and_improve(skill, initial_version, initial_run)
        skill.versions[new_version.version] = new_version
        skill.runs.append(new_version.latest_run)
        skill.improvements.append(imp_record)
        
        # Only promote if candidate met acceptance criteria and improved pass rate
        if imp_record.decision == "accepted":
            skill.current_version = new_version.version

    # Save to registry
    registry.save(skill)
    return skill
