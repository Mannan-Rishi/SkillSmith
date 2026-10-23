import unittest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import (
    Skill, SkillManifest, SkillVersion, TestCase, TestAssertion, 
    TestResult, ExecutionRun, CustomExecutionRequest, SaveTestCaseRequest,
    AppSettings
)
from backend.registry import registry, get_app_settings, save_app_settings
from backend.orchestrator import evaluate_candidate_evolution, run_autonomous_evolution_loop

class TestSkillSmithNewFeatures(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
        manifest = SkillManifest(
            name="Text Sanitizer Test",
            slug="text-sanitizer-test",
            description="Sanitizes text and counts words",
            category="text-processing",
            tags=["text", "sanitize"]
        )
        
        code = """def execute(inputs):
    text = inputs.get('text', '')
    cleaned = text.strip().lower()
    return {'cleaned': cleaned, 'length': len(cleaned)}
"""
        
        v1 = SkillVersion(
            version="1.0.0",
            manifest=manifest,
            skill_md="# Text Sanitizer Skill",
            code=code
        )

        self.test_skill = Skill(
            id="test_skill_feature_abc",
            name="Text Sanitizer Test",
            category="text-processing",
            current_version="1.0.0",
            versions={"1.0.0": v1},
            test_cases=[
                TestCase(
                    id="tc_1",
                    name="Basic Clean",
                    description="Tests simple lowercasing and trimming",
                    input_data={"text": "  Hello World  "},
                    expected_behavior="Produces cleaned lowercase text",
                    assertions=[
                        TestAssertion(assertion_type="equals", expected="hello world", target_field="cleaned"),
                        TestAssertion(assertion_type="equals", expected=11, target_field="length")
                    ]
                )
            ]
        )
        registry.save(self.test_skill)

    def tearDown(self):
        registry.delete("test_skill_feature_abc")

    # --- FEATURE A: Interactive Try Skill Runner Tests ---

    def test_custom_execution_valid_input(self):
        payload = {
            "inputs": {"text": "  FASTAPI TEST  "}
        }
        res = self.client.post(f"/api/skills/{self.test_skill.id}/execute", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["output"]["cleaned"], "fastapi test")
        self.assertEqual(data["output"]["length"], 12)
        self.assertGreaterEqual(data["execution_time_ms"], 0)
        self.assertIsNone(data["matches_expected"])

    def test_custom_execution_expected_output_match(self):
        payload = {
            "inputs": {"text": "  Test Case  "},
            "expected_output": {"cleaned": "test case", "length": 9}
        }
        res = self.client.post(f"/api/skills/{self.test_skill.id}/execute", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["matches_expected"])

    def test_custom_execution_expected_output_mismatch(self):
        payload = {
            "inputs": {"text": "  Test Case  "},
            "expected_output": {"cleaned": "wrong output", "length": 999}
        }
        res = self.client.post(f"/api/skills/{self.test_skill.id}/execute", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertFalse(data["matches_expected"])

    def test_custom_execution_runtime_error_handled_safely(self):
        # Update skill code to one that raises ZeroDivisionError on specific input
        error_skill = self.test_skill
        error_code = """def execute(inputs):
    x = inputs.get('val')
    return {'result': 100 / x}
"""
        error_skill.versions["1.0.0"].code = error_code
        registry.save(error_skill)

        payload = {"inputs": {"val": 0}}
        res = self.client.post(f"/api/skills/{error_skill.id}/execute", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["success"])
        self.assertTrue("division" in data["error"].lower() or "error" in data["error"].lower())

    def test_custom_execution_security_violation_blocked(self):
        malicious_skill = self.test_skill
        bad_code = """import os
def execute(inputs):
    return {'env': os.environ.get('SECRET')}
"""
        malicious_skill.versions["1.0.0"].code = bad_code
        registry.save(malicious_skill)

        payload = {"inputs": {}}
        res = self.client.post(f"/api/skills/{malicious_skill.id}/execute", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["success"])
        self.assertIn("Security Alert", data["logs"])

    def test_save_test_case_endpoint(self):
        payload = {
            "name": "Custom User Input Test",
            "description": "User custom test case",
            "input_data": {"text": "New Sample String"},
            "expected_output": {"cleaned": "new sample string", "length": 17}
        }
        res = self.client.post(f"/api/skills/{self.test_skill.id}/test-cases", json=payload)
        self.assertEqual(res.status_code, 200)
        tc_data = res.json()
        self.assertEqual(tc_data["name"], "Custom User Input Test")
        self.assertEqual(tc_data["input_data"], {"text": "New Sample String"})

        # Verify skill registry updated
        updated_skill = registry.get(self.test_skill.id)
        self.assertEqual(len(updated_skill.test_cases), 2)
        saved_tc = [tc for tc in updated_skill.test_cases if tc.name == "Custom User Input Test"][0]
        self.assertEqual(len(saved_tc.assertions), 1)

    # --- FEATURE B: Feedback-Driven Evolution Gate Tests ---

    def test_gate_accepts_clean_improvement(self):
        baseline_run = ExecutionRun(
            skill_id=self.test_skill.id,
            version="1.0.0",
            passed_count=1,
            failed_count=1,
            total_tests=2,
            pass_rate=50.0,
            test_results=[
                TestResult(test_id="tc_1", test_name="Test 1", passed=True),
                TestResult(test_id="tc_2", test_name="Test 2", passed=False, error_message="Failed")
            ]
        )
        candidate_run = ExecutionRun(
            skill_id=self.test_skill.id,
            version="1.0.1",
            passed_count=2,
            failed_count=0,
            total_tests=2,
            pass_rate=100.0,
            test_results=[
                TestResult(test_id="tc_1", test_name="Test 1", passed=True),
                TestResult(test_id="tc_2", test_name="Test 2", passed=True)
            ]
        )
        accepted, regression_detected, reason, fixed, regressed = evaluate_candidate_evolution(baseline_run, candidate_run)
        self.assertTrue(accepted)
        self.assertFalse(regression_detected)
        self.assertEqual(fixed, ["Test 2"])
        self.assertEqual(regressed, [])
        self.assertIn("accepted", reason.lower())

    def test_gate_rejects_regression_even_if_pass_count_equal(self):
        baseline_run = ExecutionRun(
            skill_id=self.test_skill.id,
            version="1.0.0",
            passed_count=1,
            failed_count=1,
            total_tests=2,
            pass_rate=50.0,
            test_results=[
                TestResult(test_id="tc_1", test_name="Test 1", passed=True),
                TestResult(test_id="tc_2", test_name="Test 2", passed=False, error_message="Failed")
            ]
        )
        # Candidate fails Test 1 (regression!) but passes Test 2
        candidate_run = ExecutionRun(
            skill_id=self.test_skill.id,
            version="1.0.1",
            passed_count=1,
            failed_count=1,
            total_tests=2,
            pass_rate=50.0,
            test_results=[
                TestResult(test_id="tc_1", test_name="Test 1", passed=False, error_message="Broke tc_1"),
                TestResult(test_id="tc_2", test_name="Test 2", passed=True)
            ]
        )
        accepted, regression_detected, reason, fixed, regressed = evaluate_candidate_evolution(baseline_run, candidate_run)
        self.assertFalse(accepted)
        self.assertTrue(regression_detected)
        self.assertIn("Test 1", regressed)
        self.assertIn("regression", reason.lower())

    def test_gate_rejects_no_improvement(self):
        baseline_run = ExecutionRun(
            skill_id=self.test_skill.id,
            version="1.0.0",
            passed_count=0,
            failed_count=1,
            total_tests=1,
            pass_rate=0.0,
            test_results=[
                TestResult(test_id="tc_1", test_name="Test 1", passed=False, error_message="Failed")
            ]
        )
        candidate_run = ExecutionRun(
            skill_id=self.test_skill.id,
            version="1.0.1",
            passed_count=0,
            failed_count=1,
            total_tests=1,
            pass_rate=0.0,
            test_results=[
                TestResult(test_id="tc_1", test_name="Test 1", passed=False, error_message="Still failed")
            ]
        )
        accepted, regression_detected, reason, fixed, regressed = evaluate_candidate_evolution(baseline_run, candidate_run)
        self.assertFalse(accepted)
        self.assertIn("did not exceed", reason)

    # --- FEATURE C: App Settings & Autonomous Evolution Tests ---

    def test_settings_api_get_and_post(self):
        # Test GET
        res_get = self.client.get("/api/settings")
        self.assertEqual(res_get.status_code, 200)
        current = res_get.json()
        self.assertIn("auto_evolve_on_failure", current)
        self.assertIn("max_evolution_iterations", current)

        # Test POST
        payload = {
            "auto_evolve_on_failure": True,
            "max_evolution_iterations": 3
        }
        res_post = self.client.post("/api/settings", json=payload)
        self.assertEqual(res_post.status_code, 200)
        updated = res_post.json()
        self.assertTrue(updated["auto_evolve_on_failure"])
        self.assertEqual(updated["max_evolution_iterations"], 3)

        # Restore default
        save_app_settings(AppSettings(auto_evolve_on_failure=False, max_evolution_iterations=2))

if __name__ == "__main__":
    unittest.main()

