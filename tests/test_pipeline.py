import unittest
from backend.models import SkillManifest, TestCase, TestAssertion, ExecutionRun
from backend.executors.restricted_python import run_restricted_python, SecurityViolationError
from backend.executors.evaluator import evaluate_assertion, run_test_suite_assertions
from backend.config import get_masked_key

class TestSkillSmithPipeline(unittest.TestCase):
    def test_masked_key_never_reveals_secret(self):
        masked = get_masked_key()
        self.assertNotIn("DaitHn_bkwxICONwCi6A-C4z", masked)
        self.assertTrue(masked.startswith("180c") or masked == "NOT_CONFIGURED")

    def test_sandbox_blocks_forbidden_imports(self):
        dangerous_code = "import os\ndef execute(inputs):\n    return {'files': os.listdir('.')}"
        success, output, logs, ms = run_restricted_python(dangerous_code, {})
        self.assertFalse(success)
        self.assertIn("Security Alert", logs)

    def test_sandbox_blocks_subprocess(self):
        dangerous_code = "import subprocess\ndef execute(inputs):\n    return {'out': 'bad'}"
        success, output, logs, ms = run_restricted_python(dangerous_code, {})
        self.assertFalse(success)
        self.assertIn("Security Alert", logs)

    def test_sandbox_blocks_file_open(self):
        dangerous_code = "def execute(inputs):\n    f = open('secret.txt')\n    return {}"
        success, output, logs, ms = run_restricted_python(dangerous_code, {})
        self.assertFalse(success)
        self.assertIn("Security Alert", logs)

    def test_sandbox_executes_safe_code(self):
        safe_code = """def execute(inputs):
    numbers = inputs.get('numbers', [])
    return {'count': len(numbers), 'sum': sum(numbers)}
"""
        success, output, logs, ms = run_restricted_python(safe_code, {'numbers': [10, 20, 30]})
        self.assertTrue(success)
        self.assertEqual(output['count'], 3)
        self.assertEqual(output['sum'], 60)

    def test_assertion_evaluator_contains_and_equals(self):
        a1 = TestAssertion(assertion_type="equals", expected=42, target_field="num")
        passed, msg = evaluate_assertion(a1, {"num": 42})
        self.assertTrue(passed)

        a2 = TestAssertion(assertion_type="contains", expected="flagged", target_field="status")
        passed, msg = evaluate_assertion(a2, {"status": "item_flagged_for_review"})
        self.assertTrue(passed)

    def test_assertion_evaluator_numeric_range(self):
        a = TestAssertion(assertion_type="numeric_range", expected=[0.0, 1.0], target_field="score")
        passed, msg = evaluate_assertion(a, {"score": 0.85})
        self.assertTrue(passed)

if __name__ == "__main__":
    unittest.main()
