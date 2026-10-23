# Study Note Analyzer

Analyzes raw study notes to extract structured academic content including definitions, formulas, and key topics. Generates revision aids like MCQs, flashcards, and practice questions.

## Input Schema
- `notes` (string, required): The raw text of the study notes.
- `subject` (string, optional): The academic subject.
- `topic` (string, optional): The specific topic.
- `exam_type` (string, optional): Type of exam (e.g., Midterm, Final).
- `detail_level` (string, optional): 'concise', 'balanced', or 'detailed'.
- `question_count` (int, optional): Number of questions to generate.
- `include_mcqs` (bool, optional): Whether to generate multiple choice questions.
- `include_flashcards` (bool, optional): Whether to generate flashcards.

## Output Schema
- `overall_status`: 'success', 'partial', or 'insufficient_input'.
- `subject_and_topic`: Combined subject and topic string.
- `executive_summary`: A brief overview of the notes.
- `key_topics`: List of main concepts identified.
- `key_points`: List of important statements.
- `definitions`: List of `{"term": ..., "explanation": ...}`.
- `formulas_and_rules`: List of `{"formula": ..., "context": ...}`.
- `important_examples`: List of `{"example": ..., "explanation": ...}`.
- `exam_focus`: List of `{"concept": ..., "justification": ...}`.
- `practice_questions`: List of `{"question": ..., "answer": ..., "explanation": ...}`.
- `mcqs`: List of `{"question": ..., "options": [], "correct_answer": ..., "explanation": ...}`.
- `flashcards`: List of `{"front": ..., "back": ...}`.
- `missing_or_unclear_information`: List of gaps in the notes.
- `revision_checklist`: List of suggested review steps.
- `limitations`: List of analysis constraints.