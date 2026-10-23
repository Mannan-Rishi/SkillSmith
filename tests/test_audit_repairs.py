import unittest
import time
from backend.models import TestAssertion, TestCase, TestResult, ExecutionRun
from backend.executors.restricted_python import run_restricted_python, SecurityViolationError
from backend.executors.evaluator import evaluate_assertion, evaluate_assertion_detailed, resolve_json_path, run_test_suite_assertions
from backend.orchestrator import evaluate_candidate_evolution
from backend.registry import registry

class TestAuditRepairs(unittest.TestCase):
    # -------------------------------------------------------------------------
    # 1. Execution Sandbox & Security Policy
    # -------------------------------------------------------------------------
    def test_ast_module_permitted_for_static_analysis(self):
        code = """import ast
def execute(inputs):
    tree = ast.parse("x = 10 + 20")
    return {"node_count": len(list(ast.walk(tree)))}
"""
        success, output, logs, ms = run_restricted_python(code, {})
        self.assertTrue(success, f"Expected ast import to succeed, got logs: {logs}")
        self.assertGreater(output["node_count"], 0)

    def test_os_and_subprocess_strictly_prohibited(self):
        for mod in ["os", "sys", "subprocess", "socket", "shutil"]:
            code = f"import {mod}\ndef execute(inputs):\n    return {{}}"
            success, output, logs, ms = run_restricted_python(code, {})
            self.assertFalse(success)
            self.assertIn("Security Alert", logs)

    def test_forbidden_calls_prohibited(self):
        for fn in ["open", "exec", "eval", "compile", "getattr"]:
            code = f"def execute(inputs):\n    {fn}('something')\n    return {{}}"
            success, output, logs, ms = run_restricted_python(code, {})
            self.assertFalse(success)
            self.assertIn("prohibited", logs)

    def test_bounded_execution_timeout(self):
        infinite_loop = """def execute(inputs):
    while True:
        pass
    return {}
"""
        start = time.perf_counter()
        success, output, logs, ms = run_restricted_python(infinite_loop, {}, timeout_seconds=1.0)
        elapsed = time.perf_counter() - start
        self.assertFalse(success)
        self.assertIn("timed out", logs.lower())
        self.assertLess(elapsed, 2.5)

    # -------------------------------------------------------------------------
    # 2. JSON Path Resolution & Type-Aware Assertions
    # -------------------------------------------------------------------------
    def test_resolve_json_path_dot_and_bracket(self):
        data = {
            "claims": [
                {"classification": "factual", "verification_status": "supported"},
                {"classification": "opinion", "verification_status": "unsupported"}
            ],
            "missing_values": {"age": 1, "email": 0}
        }
        self.assertEqual(resolve_json_path(data, "claims[0].classification"), "factual")
        self.assertEqual(resolve_json_path(data, "claims[1].verification_status"), "unsupported")
        self.assertEqual(resolve_json_path(data, "missing_values.age"), 1)
        self.assertIsNone(resolve_json_path(data, "claims[99].classification"))
        self.assertIsNone(resolve_json_path(data, "nonexistent.field"))

    def test_numeric_range_assertion_rejects_boolean_safely(self):
        assertion = TestAssertion(assertion_type="numeric_range", expected=[0, 5], target_field="is_valid")
        passed, msg = evaluate_assertion(assertion, {"is_valid": True})
        self.assertFalse(passed)
        self.assertIn("boolean", msg.lower())

    def test_numeric_range_assertion_handles_collection_lengths(self):
        assertion = TestAssertion(assertion_type="numeric_range", expected=[1, 3], target_field="items")
        passed, msg = evaluate_assertion(assertion, {"items": ["apple", "banana"]})
        self.assertTrue(passed)

    def test_numeric_range_assertion_does_not_raise_on_nonnumeric_list(self):
        assertion = TestAssertion(assertion_type="numeric_range", expected=[0, 2], target_field="tags")
        passed, msg, is_err = evaluate_assertion_detailed(assertion, {"tags": ["a", "b", "c", "d"]})
        self.assertFalse(passed)
        self.assertFalse(is_err, "Evaluator should not crash with uncaught exception on list")

    def test_equals_collection_size_comparison(self):
        assertion = TestAssertion(assertion_type="equals", expected=0, target_field="claims")
        passed, msg = evaluate_assertion(assertion, {"claims": []})
        self.assertTrue(passed)

    def test_length_assertion_exact_and_range(self):
        a_exact = TestAssertion(assertion_type="length", expected=3, target_field="arr")
        passed, msg = evaluate_assertion(a_exact, {"arr": [1, 2, 3]})
        self.assertTrue(passed)

        a_range = TestAssertion(assertion_type="length", expected=[1, 5], target_field="arr")
        passed, msg = evaluate_assertion(a_range, {"arr": [1, 2, 3]})
        self.assertTrue(passed)

    def test_contains_substring_in_list_elements(self):
        assertion = TestAssertion(assertion_type="contains", expected="migrate to AWS", target_field="decisions")
        passed, msg = evaluate_assertion(assertion, {"decisions": ["We decided to migrate to AWS next year"]})
        self.assertTrue(passed)

    # -------------------------------------------------------------------------
    # 3. Evolution Gate: Zero Regressions Requirement
    # -------------------------------------------------------------------------
    def test_evolution_rejects_candidate_with_regressions(self):
        baseline = ExecutionRun(
            skill_id="test_s", version="1.0.0", passed_count=2, failed_count=1, total_tests=3, pass_rate=66.7,
            test_results=[
                TestResult(test_id="t1", test_name="T1", passed=True),
                TestResult(test_id="t2", test_name="T2", passed=True),
                TestResult(test_id="t3", test_name="T3", passed=False)
            ]
        )
        candidate = ExecutionRun(
            skill_id="test_s", version="1.0.1", passed_count=2, failed_count=1, total_tests=3, pass_rate=66.7,
            test_results=[
                TestResult(test_id="t1", test_name="T1", passed=True),
                TestResult(test_id="t2", test_name="T2", passed=False), # Regressed!
                TestResult(test_id="t3", test_name="T3", passed=True)
            ]
        )
        accepted, regressed, reason, fixed, reg_tests = evaluate_candidate_evolution(baseline, candidate)
        self.assertFalse(accepted)
        self.assertTrue(regressed)
        self.assertIn("T2", reg_tests)

    # -------------------------------------------------------------------------
    # 4. Verified Skill Behaviors (Study Notes, Complexity, Bug Detector)
    # -------------------------------------------------------------------------
    def test_study_notes_analyzer_extracts_formula_and_distinct_mcqs(self):
        s = registry.get("skill_862f323c")
        self.assertIsNotNone(s)
        code = s.versions[s.current_version].code
        inputs = {
            "notes": "Newton's First Law is defined as an object at rest stays at rest. The formula is F=ma. Gravity is the force of attraction.",
            "subject": "Physics",
            "topic": "Mechanics",
            "question_count": 2,
            "include_mcqs": True
        }
        success, out, logs, ms = run_restricted_python(code, inputs)
        self.assertTrue(success)
        # Check F=ma extracted
        formula_strs = [f.get("formula") for f in out.get("formulas_and_rules", [])]
        self.assertTrue(any("F=ma" in f for f in formula_strs))
        # Check no placeholder MCQs
        for mcq in out.get("mcqs", []):
            self.assertEqual(len(mcq["options"]), 4)
            for opt in mcq["options"]:
                self.assertNotIn("Incorrect option", opt)

    def test_complexity_analyzer_recognizes_constant_auxiliary_space(self):
        s = registry.get("skill_4d0f37f6")
        self.assertIsNotNone(s)
        code = s.versions[s.current_version].code
        inputs = {
            "code": """def count_odds(arr):
    count = 0
    for x in arr:
        if x % 2 != 0:
            count += 1
    return count
"""
        }
        success, out, logs, ms = run_restricted_python(code, inputs)
        self.assertTrue(success)
        self.assertEqual(out["time_complexity"], "O(n)")
        self.assertEqual(out["space_complexity"], "O(1)")

    def test_bug_detector_separates_pep8_from_runtime_bugs(self):
        s = registry.get("skill_bd33bb8b")
        self.assertIsNotNone(s)
        code = s.versions[s.current_version].code
        inputs = {
            "code": """def BadFunctionName():
    x = 10
    return x
"""
        }
        success, out, logs, ms = run_restricted_python(code, inputs)
        self.assertTrue(success)
        self.assertEqual(out["bug_count"], 0)
        self.assertTrue(any("snake_case" in s for s in out.get("style_issues", [])))

if __name__ == "__main__":
    unittest.main()
