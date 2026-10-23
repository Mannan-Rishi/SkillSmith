# Professional Text Reviewer

Analyzes professional communications for grammar, tone, and completeness based on the target audience and purpose.

## Inputs
- `text` (string, required): The message to be reviewed.
- `audience` (string, optional): The target recipient (e.g., 'CEO', 'Client'). Defaults to 'General Professional'.
- `purpose` (string, optional): The goal of the message (e.g., 'Meeting Request'). Defaults to 'General Communication'.
- `tone` (string, optional): The desired tone (e.g., 'Formal', 'Professional'). Defaults to 'Professional'.

## Outputs
- `overall_status` (string): 'good', 'needs_improvement', or 'insufficient_input'.
- `summary` (string): A brief overview of the findings.
- `issues` (list): A list of objects containing `type`, `severity`, `quoted_text`, `explanation`, and `suggestion`.
- `strengths` (list): A list of positive attributes of the text.
- `revised_text` (string): A cleaned-up version of the input text.
- `missing_information` (list): A list of critical missing elements based on the purpose.
- `tone_assessment` (string): Analysis of whether the detected tone matches the desired tone.