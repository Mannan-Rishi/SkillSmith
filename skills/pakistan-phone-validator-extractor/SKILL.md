# Pakistan Phone Number Validator

Validates Pakistani phone numbers and converts them to a standardized international format.

## Input
- `phone_number` (string): The phone number to validate.

## Output
- `is_valid` (boolean): True if the number matches valid Pakistani formats.
- `operator_code` (string|null): The 4-digit operator code (e.g., '0300').
- `formatted_number` (string|null): The number in +923XXXXXXXXX format.