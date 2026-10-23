import re
from typing import Any, List, Dict, Tuple, Optional
from backend.models import TestAssertion

def resolve_json_path(data: Any, path: Optional[str]) -> Any:
    """
    Safely resolves dot-notation and bracketed index paths, e.g.:
    'missing_values.age' -> data['missing_values']['age']
    'claims[0].classification' -> data['claims'][0]['classification']
    'contradictions[0]' -> data['contradictions'][0]
    Returns None if any step cannot be resolved.
    """
    if not path or data is None:
        return data

    # Replace bracketed integer index [0] with .0
    normalized = re.sub(r'\[(\d+)\]', r'.\1', str(path))
    parts = [p.strip() for p in normalized.split('.') if p.strip()]

    curr = data
    for part in parts:
        if curr is None:
            return None
        if part.isdigit():
            idx = int(part)
            if isinstance(curr, (list, tuple)) and 0 <= idx < len(curr):
                curr = curr[idx]
            elif isinstance(curr, dict) and part in curr:
                curr = curr[part]
            else:
                return None
        elif isinstance(curr, dict):
            if part in curr:
                curr = curr[part]
            else:
                # Case-insensitive key lookup fallback
                part_lower = part.lower()
                matched_key = next((k for k in curr.keys() if str(k).lower() == part_lower), None)
                if matched_key is not None:
                    curr = curr[matched_key]
                else:
                    return None
        elif hasattr(curr, part):
            curr = getattr(curr, part)
        else:
            return None

    return curr

def evaluate_assertion_detailed(assertion: TestAssertion, actual_output: Any) -> Tuple[bool, str, bool]:
    """
    Evaluates a single assertion against actual output.
    Returns: (passed: bool, message: str, is_evaluator_error: bool)
    """
    # 1. Resolve targeted field or entire output
    if assertion.target_field:
        target_val = resolve_json_path(actual_output, assertion.target_field)
    else:
        target_val = actual_output

    a_type = (assertion.assertion_type or "equals").strip().lower()
    expected = assertion.expected

    try:
        if a_type in ("equals", "eq", "exact"):
            if target_val == expected:
                return True, f"Expected {expected}, got {target_val}", False
            
            # If target is a collection and expected is a number, compare size
            if isinstance(target_val, (list, tuple, set, dict)) and isinstance(expected, (int, float)) and not isinstance(expected, bool):
                if len(target_val) == int(expected):
                    return True, f"Matched collection size {len(target_val)} == {expected}", False

            # String comparison with whitespace trimming and case tolerance
            if isinstance(target_val, str) and isinstance(expected, str):
                if target_val.strip() == expected.strip():
                    return True, f"Matched string with whitespace normalization: '{expected}'", False
                if target_val.strip().lower() == expected.strip().lower():
                    return True, f"Matched string case-insensitively: '{expected}'", False

            # Numeric equivalence e.g. 1 == 1.0 or "0" == 0
            if not isinstance(target_val, bool) and not isinstance(expected, bool):
                try:
                    if float(target_val) == float(expected):
                        return True, f"Matched numeric value {expected} == {target_val}", False
                except (ValueError, TypeError):
                    pass

            # If target_field was not specified and actual_output is a dictionary,
            # check if expected matches any value inside the dictionary
            if assertion.target_field is None and isinstance(actual_output, dict):
                for k, v in actual_output.items():
                    if v == expected or str(v).strip() == str(expected).strip():
                        return True, f"Matched expected {expected} on dictionary field '{k}'", False

            return False, f"Expected '{expected}', got '{target_val}' (target: {assertion.target_field or 'root'})", False

        elif a_type in ("contains", "contain", "includes"):
            if target_val is None:
                return False, f"Target '{assertion.target_field}' is None, cannot check if it contains '{expected}'", False

            expected_str = str(expected).strip().lower()

            if isinstance(target_val, (list, tuple, set)):
                # Exact element check
                if expected in target_val:
                    return True, f"Found exact item '{expected}' in list", False
                # Substring check within string elements or dictionary values
                for item in target_val:
                    if isinstance(item, str) and expected_str in item.lower():
                        return True, f"Found substring '{expected}' inside list item '{item}'", False
                    if isinstance(item, dict):
                        for dv in item.values():
                            if expected_str in str(dv).lower():
                                return True, f"Found '{expected}' in list dictionary value '{dv}'", False
                return False, f"'{expected}' not found in list (size: {len(target_val)})", False

            elif isinstance(target_val, str):
                passed = expected_str in target_val.lower()
                return passed, f"Checked substring '{expected}' in text (found: {passed})", False

            elif isinstance(target_val, dict):
                # Check keys
                if expected in target_val or str(expected) in target_val:
                    return True, f"Found key '{expected}' in dictionary", False
                # Check values
                for k, v in target_val.items():
                    if expected_str in str(v).lower():
                        return True, f"Found substring '{expected}' in dict field '{k}'", False
                return False, f"'{expected}' not found in dictionary keys or string values", False

            else:
                passed = expected_str in str(target_val).lower()
                return passed, f"Checked substring '{expected}' in string representation", False

        elif a_type in ("not_empty", "truthy", "is_not_empty"):
            if target_val is None:
                return False, f"Target '{assertion.target_field or 'root'}' is None", False
            if isinstance(target_val, str):
                passed = bool(target_val.strip())
                return passed, f"Checked string is non-empty (length: {len(target_val.strip())})", False
            if isinstance(target_val, (list, dict, tuple, set)):
                passed = len(target_val) > 0
                return passed, f"Checked collection is non-empty (size: {len(target_val)})", False
            passed = bool(target_val)
            return passed, f"Checked truthiness: {passed}", False

        elif a_type in ("numeric_range", "range"):
            if not isinstance(expected, (list, tuple)) or len(expected) != 2:
                return False, f"Invalid numeric_range assertion format. Expected [min, max], got {expected}", False

            min_val, max_val = float(expected[0]), float(expected[1])

            # Reject booleans explicitly (Python bool is subclass of int)
            if isinstance(target_val, bool):
                return False, f"Boolean value ({target_val}) is not a valid number for numeric_range", False

            # If target_val is a collection, test its length against the range
            if isinstance(target_val, (list, tuple, set, dict)):
                size = len(target_val)
                passed = (min_val <= size <= max_val)
                return passed, f"Checked collection size {size} in range [{min_val}, {max_val}]", False

            # If target_val is numeric
            if isinstance(target_val, (int, float)):
                val = float(target_val)
                passed = (min_val <= val <= max_val)
                return passed, f"Checked if {min_val} <= {val} <= {max_val}", False

            # If target_val is a numeric string
            if isinstance(target_val, str) and target_val.strip():
                try:
                    val = float(target_val.strip())
                    passed = (min_val <= val <= max_val)
                    return passed, f"Parsed string number {val}: checked [{min_val}, {max_val}]", False
                except ValueError:
                    return False, f"String '{target_val}' cannot be parsed as a number for numeric_range", False

            # If target_field was not specified and actual_output is a dictionary, scan for a numeric field
            if assertion.target_field is None and isinstance(actual_output, dict):
                for k, v in actual_output.items():
                    if isinstance(v, (int, float)) and not isinstance(v, bool):
                        val = float(v)
                        passed = (min_val <= val <= max_val)
                        return passed, f"Checked field '{k}' value {val} in range [{min_val}, {max_val}]", False

            return False, f"Cannot evaluate numeric_range on target '{assertion.target_field}': got {type(target_val).__name__} ({target_val})", False

        elif a_type in ("length", "count", "size"):
            if target_val is None:
                return False, f"Target '{assertion.target_field or 'root'}' is None, has no length", False
            if not hasattr(target_val, "__len__"):
                return False, f"Target {type(target_val).__name__} does not have length", False

            actual_len = len(target_val)
            if isinstance(expected, int):
                passed = (actual_len == expected)
                return passed, f"Checked length: expected {expected}, got {actual_len}", False
            elif isinstance(expected, (list, tuple)) and len(expected) == 2:
                passed = (expected[0] <= actual_len <= expected[1])
                return passed, f"Checked length {actual_len} in range [{expected[0]}, {expected[1]}]", False
            elif isinstance(expected, dict):
                min_len = expected.get("min", 0)
                max_len = expected.get("max", float("inf"))
                passed = (min_len <= actual_len <= max_len)
                return passed, f"Checked length {actual_len} in bounds [{min_len}, {max_len}]", False
            return False, f"Unsupported length assertion format: {expected}", False

        elif a_type in ("type", "is_type", "schema_type"):
            if target_val is None:
                return False, f"Target '{assertion.target_field}' is None, expected type '{expected}'", False
            expected_type = str(expected).strip().lower()
            type_map = {
                "list": list, "array": list,
                "dict": dict, "object": dict,
                "str": str, "string": str,
                "int": int, "integer": int,
                "float": float, "number": (int, float),
                "bool": bool, "boolean": bool
            }
            target_cls = type_map.get(expected_type)
            if target_cls:
                if expected_type in ("int", "integer", "number", "float") and isinstance(target_val, bool):
                    return False, f"Expected {expected_type}, but got boolean True/False", False
                passed = isinstance(target_val, target_cls)
                return passed, f"Checked type: expected {expected_type}, got {type(target_val).__name__}", False
            return False, f"Unknown schema type check: {expected_type}", False

        elif a_type in ("has_key", "key_exists"):
            # Direct dictionary check
            if isinstance(target_val, dict):
                passed = (expected in target_val or str(expected) in target_val)
                return passed, f"Checked key '{expected}' in dictionary keys {list(target_val.keys())}", False
            # List of dictionaries check
            if isinstance(target_val, (list, tuple)):
                for idx, item in enumerate(target_val):
                    if isinstance(item, dict) and (expected in item or str(expected) in item):
                        return True, f"Checked key '{expected}' found in list item #{idx}", False
                return False, f"Key '{expected}' not found in any dictionary element of list", False
            # Fallback to root actual_output if target_field was not specified
            if assertion.target_field is None and isinstance(actual_output, dict):
                passed = (expected in actual_output or str(expected) in actual_output)
                return passed, f"Checked key '{expected}' in root keys {list(actual_output.keys())}", False
            return False, f"Target is neither a dictionary nor a list of dictionaries: {type(target_val).__name__}", False

        elif a_type in ("greater_than", "gt"):
            try:
                val = float(target_val)
                passed = val > float(expected)
                return passed, f"Checked if {val} > {expected}", False
            except (ValueError, TypeError):
                return False, f"Could not perform greater_than on non-numeric value: {target_val}", False

        elif a_type in ("less_than", "lt"):
            try:
                val = float(target_val)
                passed = val < float(expected)
                return passed, f"Checked if {val} < {expected}", False
            except (ValueError, TypeError):
                return False, f"Could not perform less_than on non-numeric value: {target_val}", False

        elif a_type in ("regex", "pattern"):
            if target_val is None:
                return False, f"Target is None, cannot match regex /{expected}/", False
            pattern = re.compile(str(expected), re.IGNORECASE)
            if isinstance(target_val, dict):
                for k, v in target_val.items():
                    if pattern.search(str(v)):
                        return True, f"Regex /{expected}/ matched in field '{k}'", False
                return False, f"Regex /{expected}/ did not match any dictionary value", False
            passed = bool(pattern.search(str(target_val)))
            return passed, f"Regex /{expected}/ match on output", False

        else:
            # Fallback string representation containment
            if isinstance(actual_output, dict):
                for k, v in actual_output.items():
                    if str(expected).strip().lower() in str(v).strip().lower():
                        return True, f"Matched '{expected}' in field '{k}'", False
            passed = str(expected).strip().lower() in str(target_val).strip().lower()
            return passed, f"Fallback check for substring '{expected}'", False

    except Exception as e:
        # Genuine evaluator internal crash
        return False, f"Evaluation error: {str(e)}", True

def evaluate_assertion(assertion: TestAssertion, actual_output: Any) -> Tuple[bool, str]:
    """
    Standard binary evaluation for backward-compatible call sites.
    Returns: (passed: bool, message: str)
    """
    passed, msg, _ = evaluate_assertion_detailed(assertion, actual_output)
    return passed, msg

def run_test_suite_assertions(assertions: List[TestAssertion], actual_output: Any) -> Tuple[bool, List[Dict[str, Any]]]:
    """Evaluates all assertions for a test case."""
    if not assertions:
        passed = actual_output is not None and actual_output != ""
        return passed, [{"assertion_type": "default_truthy", "expected": True, "target_field": None, "passed": passed, "message": "Default non-empty check", "is_evaluator_error": False}]

    results = []
    all_passed = True
    for a in assertions:
        passed, msg, is_eval_err = evaluate_assertion_detailed(a, actual_output)
        if not passed:
            all_passed = False
        results.append({
            "assertion_type": a.assertion_type,
            "expected": a.expected,
            "target_field": a.target_field,
            "passed": passed,
            "message": msg,
            "is_evaluator_error": is_eval_err
        })

    return all_passed, results

