# Python Static Analyzer

Analyzes Python code for syntax errors, runtime risks, logic bugs, and PEP 8 style violations using static analysis.

## Inputs
- `code` (string): The Python source code to analyze.
- `strict_mode` (boolean): If true, flags functions missing explicit return statements.

## Outputs
- `is_valid_syntax` (boolean): True if no basic syntax errors were detected.
- `overall_status` (string): 'clean', 'syntax_error', or 'issues_found'.
- `issues` (list): List of detected bugs/risks containing `type`, `severity`, `line`, `description`, and `suggestion`.
- `bug_count` (integer): Total number of critical/high/medium issues.
- `style_issues` (list): List of PEP 8 violations.
- `warnings` (list): General warnings (e.g., empty input).