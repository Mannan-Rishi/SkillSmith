# Python Complexity Analyzer

Analyzes Python code snippets to estimate time and space complexity and detect syntax errors.

## Input
- `code` (string): The Python source code to analyze.

## Output
- `is_valid_syntax` (boolean): Whether the code passed basic heuristic syntax checks.
- `detected_constructs` (list): List of detected features (e.g., 'loop', 'recursion', 'comprehension').
- `time_complexity` (string): Big O notation for time complexity.
- `space_complexity` (string): Big O notation for space complexity.
- `explanation` (string): Reasoning behind the complexity analysis.
- `warnings` (list): List of warnings or error types detected.