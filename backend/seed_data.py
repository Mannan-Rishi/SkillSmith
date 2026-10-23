import time
from backend.models import (
    Skill, SkillVersion, SkillManifest, TestCase, TestAssertion,
    TestResult, ExecutionRun, ImprovementRecord
)
from backend.registry import registry

def populate_seed_skills():
    if len(registry.list_all()) > 0:
        return

    # 1. Data Quality & Statistical Analyzer Skill
    skill1_id = "skill_data_analyzer"
    manifest_v1 = SkillManifest(
        name="Tabular Data Quality & Outlier Detector",
        slug="data-quality-detector",
        description="Analyzes CSV/JSON tabular rows, detects missing values, computes numeric statistics, and flags statistical outliers.",
        category="Data Analysis",
        version="1.0.0",
        inputs={"rows": "List of data dictionaries", "numeric_column": "Key to analyze for statistics and outliers"},
        outputs={"row_count": "int", "mean": "float", "missing_count": "int", "outliers": "list of values"},
        execution_strategy="restricted_python",
        safety_requirements=["Pure Python memory processing", "No external I/O"]
    )
    
    code_v1 = """def execute(inputs: dict) -> dict:
    rows = inputs.get("rows", [])
    col = inputs.get("numeric_column")
    if not rows or not col:
        return {"row_count": len(rows), "mean": 0.0, "missing_count": 0, "outliers": []}
    
    values = []
    missing = 0
    for r in rows:
        val = r.get(col)
        if val is None or val == "":
            missing += 1
        else:
            try:
                values.append(float(val))
            except (ValueError, TypeError):
                missing += 1

    if not values:
        return {"row_count": len(rows), "mean": 0.0, "missing_count": missing, "outliers": []}

    avg = sum(values) / len(values)
    # v1 bug: simple threshold without variance
    outliers = [v for v in values if v > 100]
    return {
        "row_count": len(rows),
        "mean": round(avg, 2),
        "missing_count": missing,
        "outliers": outliers
    }
"""

    code_v2 = """def execute(inputs: dict) -> dict:
    rows = inputs.get("rows", [])
    col = inputs.get("numeric_column")
    if not rows or not col:
        return {"row_count": len(rows), "mean": 0.0, "missing_count": 0, "outliers": []}
    
    values = []
    missing = 0
    for r in rows:
        val = r.get(col)
        if val is None or val == "":
            missing += 1
        else:
            try:
                values.append(float(val))
            except (ValueError, TypeError):
                missing += 1

    if not values:
        return {"row_count": len(rows), "mean": 0.0, "missing_count": missing, "outliers": []}

    n = len(values)
    avg = sum(values) / n
    variance = sum((x - avg) ** 2 for x in values) / n
    std_dev = variance ** 0.5

    # Robust 2-sigma threshold outlier detection
    threshold = 2.0 * std_dev if std_dev > 0 else 0
    outliers = [v for v in values if abs(v - avg) > threshold] if threshold > 0 else []

    return {
        "row_count": len(rows),
        "mean": round(avg, 2),
        "std_dev": round(std_dev, 2),
        "missing_count": missing,
        "outliers": outliers
    }
"""

    tests = [
        TestCase(
            id="t1",
            name="Standard Numeric Distribution",
            description="Calculates correct average and detects no false outliers in uniform data",
            input_data={"rows": [{"val": 10}, {"val": 20}, {"val": 30}], "numeric_column": "val"},
            expected_behavior="Mean 20.0 and 0 outliers",
            assertions=[
                TestAssertion(assertion_type="equals", expected=20.0, target_field="mean"),
                TestAssertion(assertion_type="equals", expected=3, target_field="row_count")
            ]
        ),
        TestCase(
            id="t2",
            name="Missing and Null Fields Handling",
            description="Correctly counts missing records and does not crash",
            input_data={"rows": [{"val": 10}, {"val": None}, {"val": ""}, {"val": 30}], "numeric_column": "val"},
            expected_behavior="Identifies 2 missing records and computes mean of valid rows",
            assertions=[
                TestAssertion(assertion_type="equals", expected=2, target_field="missing_count"),
                TestAssertion(assertion_type="equals", expected=20.0, target_field="mean")
            ]
        ),
        TestCase(
            id="t3",
            name="Adversarial Statistical Outlier Detection",
            description="Detects anomalous extreme value using 2-sigma calculation",
            input_data={"rows": [{"val": 10}, {"val": 11}, {"val": 10}, {"val": 12}, {"val": 999}], "numeric_column": "val"},
            expected_behavior="Flags 999.0 as outlier",
            is_edge_case=True,
            assertions=[
                TestAssertion(assertion_type="contains", expected=999.0, target_field="outliers"),
                TestAssertion(assertion_type="not_empty", expected=True, target_field="outliers")
            ]
        )
    ]

    skill1_md = """---
name: data-quality-detector
category: Data Analysis
version: 1.0.1
execution_strategy: restricted_python
---
# Tabular Data Quality & Outlier Detector

## Purpose
Examines rows of tabular data to ensure data hygiene, identify incomplete inputs, and flag statistically significant anomalies.

## Inputs
- `rows`: List of dictionaries
- `numeric_column`: String key name

## Outputs
- `row_count`: Total evaluated rows
- `mean`: Average value of clean numeric data
- `std_dev`: Population standard deviation
- `missing_count`: Count of empty or non-numeric cells
- `outliers`: Array of numbers deviating by > 2 sigma
"""

    run_v1 = ExecutionRun(
        run_id="run_v1_seed",
        skill_id=skill1_id,
        version="1.0.0",
        timestamp=time.time() - 3600,
        status="passed",
        passed_count=3,
        failed_count=0,
        total_tests=3,
        pass_rate=100.0,
        test_results=[
            TestResult(test_id="t1", test_name="Standard Numeric Distribution", passed=True, actual_output={"mean": 20.0, "row_count": 3}),
            TestResult(test_id="t2", test_name="Missing and Null Fields Handling", passed=True, actual_output={"missing_count": 2, "mean": 20.0}),
            TestResult(test_id="t3", test_name="Adversarial Statistical Outlier Detection", passed=True, actual_output={"outliers": [999.0]})
        ]
    )

    ver1 = SkillVersion(
        version="1.0.0",
        manifest=manifest_v1,
        skill_md=skill1_md,
        code=code_v1,
        latest_run=run_v1
    )

    ver2 = SkillVersion(
        version="1.0.1",
        parent_version="1.0.0",
        manifest=manifest_v1.model_copy(update={"version": "1.0.1"}),
        skill_md=skill1_md,
        code=code_v2,
        latest_run=run_v1
    )

    imp1 = ImprovementRecord(
        iteration=1,
        previous_version="1.0.0",
        new_version="1.0.1",
        failure_analysis="v1 used hardcoded >100 outlier cutoff which fails for distributions with scale variations.",
        changes_made="Implemented standard deviation and dynamic 2-sigma boundary checks.",
        before_pass_rate=66.7,
        after_pass_rate=100.0,
        improved=True,
        regression_detected=False
    )

    skill1 = Skill(
        id=skill1_id,
        name="Tabular Data Quality & Outlier Detector",
        category="Data Analysis",
        current_version="1.0.1",
        versions={"1.0.0": ver1, "1.0.1": ver2},
        test_cases=tests,
        runs=[run_v1],
        improvements=[imp1],
        created_at=time.time() - 3600,
        updated_at=time.time()
    )

    # 2. Security & Header Policy Verifier Skill
    skill2_id = "skill_security_verifier"
    manifest_sec = SkillManifest(
        name="HTTP Security Header & SSL Policy Verifier",
        slug="http-security-auditor",
        description="Inspects server headers and security configurations for missing defense-in-depth protections (HSTS, CSP, X-Frame-Options).",
        category="Security / Web QA",
        version="1.0.0",
        inputs={"headers": "Dict of HTTP response headers", "url": "Target URL"},
        outputs={"grade": "str", "score": "int", "missing_headers": "list", "findings": "list"}
    )
    code_sec = """def execute(inputs: dict) -> dict:
    headers = {k.lower(): v for k, v in inputs.get("headers", {}).items()}
    required_headers = {
        "strict-transport-security": "Enforces HTTPS connections (HSTS)",
        "content-security-policy": "Mitigates Cross-Site Scripting (CSP)",
        "x-frame-options": "Prevents Clickjacking attacks",
        "x-content-type-options": "Disables MIME-type sniffing"
    }
    
    missing = []
    findings = []
    score = 100

    for h, desc in required_headers.items():
        if h not in headers:
            missing.append(h)
            findings.append(f"Missing header '{h}': {desc}")
            score -= 25

    grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 50 else "F"
    return {
        "url": inputs.get("url", ""),
        "grade": grade,
        "score": max(0, score),
        "missing_headers": missing,
        "findings": findings
    }
"""
    tests_sec = [
        TestCase(
            id="s1",
            name="Hardened Server Configuration",
            description="Verifies that a fully protected server receives an 'A' grade with 100 score",
            input_data={
                "url": "https://secure.example.com",
                "headers": {
                    "Strict-Transport-Security": "max-age=31536000",
                    "Content-Security-Policy": "default-src 'self'",
                    "X-Frame-Options": "DENY",
                    "X-Content-Type-Options": "nosniff"
                }
            },
            expected_behavior="Grade A and 0 missing headers",
            assertions=[
                TestAssertion(assertion_type="equals", expected="A", target_field="grade"),
                TestAssertion(assertion_type="equals", expected=100, target_field="score")
            ]
        ),
        TestCase(
            id="s2",
            name="Vulnerable Legacy Server Headers",
            description="Detects multiple missing headers and degrades score appropriately",
            input_data={
                "url": "http://legacy.example.com",
                "headers": {"Server": "Apache/2.4"}
            },
            expected_behavior="Score dropped and missing headers identified",
            assertions=[
                TestAssertion(assertion_type="contains", expected="strict-transport-security", target_field="missing_headers"),
                TestAssertion(assertion_type="equals", expected=0, target_field="score")
            ]
        )
    ]

    skill2_md = """---
name: http-security-auditor
category: Security / Web QA
version: 1.0.0
---
# HTTP Security Header & SSL Policy Verifier

## Purpose
Inspects HTTP response headers against OWASP security guidance to evaluate client-side defense postures.
"""
    run_sec = ExecutionRun(
        run_id="run_sec_seed",
        skill_id=skill2_id,
        version="1.0.0",
        timestamp=time.time() - 1800,
        status="passed",
        passed_count=2,
        failed_count=0,
        total_tests=2,
        pass_rate=100.0,
        test_results=[
            TestResult(test_id="s1", test_name="Hardened Server Configuration", passed=True, actual_output={"grade": "A", "score": 100}),
            TestResult(test_id="s2", test_name="Vulnerable Legacy Server Headers", passed=True, actual_output={"grade": "F", "score": 0})
        ]
    )

    ver_sec = SkillVersion(
        version="1.0.0",
        manifest=manifest_sec,
        skill_md=skill2_md,
        code=code_sec,
        latest_run=run_sec
    )

    skill2 = Skill(
        id=skill2_id,
        name="HTTP Security Header & SSL Policy Verifier",
        category="Security / Web QA",
        current_version="1.0.0",
        versions={"1.0.0": ver_sec},
        test_cases=tests_sec,
        runs=[run_sec],
        improvements=[],
        created_at=time.time() - 1800,
        updated_at=time.time()
    )

    registry.save(skill1)
    registry.save(skill2)
    print("Seed skills successfully populated.")
