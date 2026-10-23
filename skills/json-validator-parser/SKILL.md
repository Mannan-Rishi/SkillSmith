---
name: JSON Validator & Parser
slug: json-validator-parser
category: Developer Tools
version: 1.0.0
---

# JSON Validator & Parser

## Overview
Validates the syntactic correctness of a JSON string and returns the parsed data structure if valid, or a detailed error message if invalid. This skill ensures that a string adheres to the JSON standard (RFC 8259).

## Usage
Use this skill when you need to verify if a string is a valid JSON object, array, or primitive before attempting to process it in a downstream workflow.

### Inputs
- `json_text` (string): The raw string containing JSON content to be validated and parsed.

### Outputs
- `is_valid` (boolean): Indicates if the input string is syntactically valid JSON.
- `parsed_data` (any/null): The resulting Python object/primitive after parsing; `null` if invalid.
- `error_message` (string): A descriptive error message explaining the parsing failure; empty string if valid.

## Steps
1. **Input Validation**: Check if `json_text` is present and is a string.
2. **Parsing Attempt**: Use the standard `json.loads()` method to parse the input string.
3. **Success Path**: If parsing succeeds, return `is_valid=True` and the parsed object.
4. **Failure Path**: If a `json.JSONDecodeError` occurs, capture the error message and return `is_valid=False`.

## Error Handling
- **Missing Input**: Returns `is_valid=False` with a message indicating the input key was missing.
- **Empty Input**: Returns `is_valid=False` with a message indicating the input string was empty.
- **Malformed JSON**: Returns `is_valid=False` with the specific exception message from the JSON decoder.