# PII Masking (Pakistani Context)

This skill identifies and masks Personally Identifiable Information (PII) specifically tailored for Pakistani contexts, focusing on email addresses and Pakistani mobile phone numbers.

## Capabilities
- **Email Detection**: Identifies standard email formats.
- **Pakistani Phone Detection**: Identifies mobile numbers starting with `03` or `+92 3` followed by 9 digits.
- **Text Sanitization**: Replaces detected PII with `[EMAIL]` and `[PHONE]` placeholders.
- **Counting**: Returns the total count of emails and phone numbers found.

## Input Schema
- `input_text` (string): The text to be sanitized.

## Output Schema
- `sanitized_text` (string): The text with PII masked.
- `email_count` (integer): Number of emails found.
- `phone_count` (integer): Number of phone numbers found.