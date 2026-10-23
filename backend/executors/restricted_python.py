import ast
import sys
import io
import time
import math
import re
import json
import datetime
import collections
import itertools
import string
import threading
from typing import Dict, Any, Tuple

ALLOWED_MODULES = {
    "math", "re", "json", "datetime", "collections", "itertools", 
    "string", "typing", "random", "decimal", "fractions", "ast"
}

FORBIDDEN_MODULES = {
    "os", "sys", "subprocess", "socket", "shutil", "http", "urllib", "requests", 
    "pickle", "ctypes", "pty", "posix", "winreg", "builtin_import", "pathlib",
    "asyncio", "threading", "multiprocessing"
}

FORBIDDEN_CALLS = {
    "open", "exec", "eval", "compile", "getattr", "setattr", "delattr", 
    "globals", "locals", "exit", "quit"
}

class SecurityViolationError(Exception):
    pass

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    base_module = name.split(".")[0]
    if base_module in ALLOWED_MODULES:
        return __import__(name, globals, locals, fromlist, level)
    raise SecurityViolationError(f"Security Alert: Import of module '{name}' is not permitted in sandbox.")

class SafetyValidator(ast.NodeVisitor):
    def visit_Import(self, node):
        for alias in node.names:
            base_module = alias.name.split(".")[0]
            if base_module in FORBIDDEN_MODULES or base_module not in ALLOWED_MODULES:
                raise SecurityViolationError(f"Security Alert: Import of module '{base_module}' is not permitted.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module:
            base_module = node.module.split(".")[0]
            if base_module in FORBIDDEN_MODULES or base_module not in ALLOWED_MODULES:
                raise SecurityViolationError(f"Security Alert: Import from module '{base_module}' is not permitted.")
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in FORBIDDEN_CALLS:
                raise SecurityViolationError(f"Security Alert: Call to function '{node.func.id}()' is prohibited.")
        self.generic_visit(node)

def run_restricted_python(code_str: str, input_data: Dict[str, Any], timeout_seconds: float = 3.0) -> Tuple[bool, Any, str, float]:
    """
    Executes Python skill code in a restricted execution namespace with safety AST checks.
    Enforces AST inspection, allowlisted standard libraries, forbidden primitives, and bounded timeout.
    Returns: (success: bool, output: Any, logs: str, execution_time_ms: float)
    """
    start_time = time.perf_counter()
    stdout_capture = io.StringIO()
    
    # 1. AST Safety Verification
    try:
        tree = ast.parse(code_str)
        validator = SafetyValidator()
        validator.visit(tree)
    except SecurityViolationError as sve:
        return False, None, str(sve), (time.perf_counter() - start_time) * 1000
    except SyntaxError as se:
        return False, None, f"Syntax Error in generated skill code: {se}", (time.perf_counter() - start_time) * 1000

    # 2. Build Safe Global Scope
    safe_builtins = {
        # Import hook
        "__import__": safe_import,
        # Common functions
        "abs": abs, "all": all, "any": any, "bin": bin, "bool": bool, "chr": chr,
        "dict": dict, "divmod": divmod, "enumerate": enumerate, "filter": filter,
        "float": float, "format": format, "frozenset": frozenset, "hash": hash,
        "hex": hex, "int": int, "isinstance": isinstance, "issubclass": issubclass,
        "iter": iter, "len": len, "list": list, "map": map, "max": max, "min": min,
        "next": next, "oct": oct, "ord": ord, "pow": pow, "range": range, "repr": repr,
        "reversed": reversed, "round": round, "set": set, "slice": slice, "sorted": sorted,
        "str": str, "sum": sum, "tuple": tuple, "type": type, "zip": zip, "dir": dir,
        # Exceptions
        "Exception": Exception, "ValueError": ValueError, "TypeError": TypeError,
        "KeyError": KeyError, "IndexError": IndexError, "AttributeError": AttributeError,
        "LookupError": LookupError, "RuntimeError": RuntimeError, "ZeroDivisionError": ZeroDivisionError,
        "AssertionError": AssertionError, "StopIteration": StopIteration, "SyntaxError": SyntaxError,
        # Class building
        "__build_class__": __build_class__,
        # Output capture
        "print": lambda *args, **kwargs: print(*args, file=stdout_capture, **kwargs)
    }

    safe_globals = {
        "__name__": "__skill_sandbox__",
        "__doc__": None,
        "__builtins__": safe_builtins,
        "math": math,
        "re": re,
        "json": json,
        "datetime": datetime,
        "collections": collections,
        "itertools": itertools,
        "string": string,
        "ast": ast
    }

    local_vars = {"inputs": input_data, "result": None}

    # 3. Execution with Bounded Timeout
    old_stdout = sys.stdout
    try:
        sys.stdout = stdout_capture
        compiled = compile(tree, filename="<skill_sandbox>", mode="exec")

        res_holder = {"output": None, "error": None, "completed": False}

        def _worker():
            try:
                exec(compiled, safe_globals, local_vars)
                if "execute" in local_vars and callable(local_vars["execute"]):
                    res_holder["output"] = local_vars["execute"](input_data)
                elif "result" in local_vars and local_vars["result"] is not None:
                    res_holder["output"] = local_vars["result"]
                else:
                    res_holder["output"] = {k: v for k, v in local_vars.items() if k not in ("inputs", "execute")}
                res_holder["completed"] = True
            except Exception as ex:
                res_holder["error"] = ex

        worker_thread = threading.Thread(target=_worker, daemon=True)
        worker_thread.start()
        worker_thread.join(timeout=timeout_seconds)

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logs = stdout_capture.getvalue()

        if worker_thread.is_alive():
            return False, None, f"Execution timed out: exceeded safety limit of {timeout_seconds}s", elapsed_ms

        if res_holder["error"]:
            return False, None, f"Execution Error: {str(res_holder['error'])}\nLogs: {logs}", elapsed_ms

        output = res_holder["output"]
        if output is None and not logs:
            return False, None, "Execution produced no output and returned None.", elapsed_ms

        return True, output, logs, elapsed_ms

    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logs = stdout_capture.getvalue()
        return False, None, f"Execution Error: {str(e)}\nLogs: {logs}", elapsed_ms
    finally:
        sys.stdout = old_stdout
