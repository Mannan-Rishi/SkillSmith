---
name: Meeting & Task Action-Item Extractor
slug: meeting-task-action-item-extractor
category: Productivity & Project Management
version: 1.0.0
---

# Meeting & Task Action-Item Extractor

## Overview
Transforms unstructured meeting notes or discussion transcripts into a structured format containing decisions, action items, deadlines, owners, and unresolved questions. This skill uses pattern recognition to isolate commitments and conclusions from general discussion.

## Usage

### Inputs
- `notes` (string, required): The raw text containing meeting notes or discussion content.
- `meeting_date` (string, optional): The date the meeting occurred.
- `participants` (array of strings, optional): A list of individuals present at the meeting.

### Outputs
- `overall_status` (string): 'success', 'partial', or 'insufficient_input'.
- `summary` (string): A concise summary of the meeting.
- `decisions` (array of strings): Confirmed decisions explicitly stated.
- `action_items` (array of objects): List of tasks with `task`, `owner`, `deadline`, `priority`, and `source_text`.
- `unassigned_tasks` (array of strings): Tasks identified without a clear owner.
- `open_questions` (array of strings): Unresolved questions or missing details.
- `risks` (array of strings): Explicitly stated or strongly implied risks.
- `limitations` (array of strings): Uncertainties regarding the extraction.

## Steps
1. **Input Validation**: Check if `notes` is provided and non-empty.
2. **Pattern Analysis**: Scan text for keywords indicating decisions (e.g., "decided", "agreed", "conclusion"), actions (e.g., "will do", "action item", "task"), and questions (e.g., "?", "unresolved", "TBD").
3. **Entity Extraction**: Attempt to map owners and deadlines based on proximity to action keywords.
4. **Categorization**: Separate confirmed decisions from proposals and route ownerless tasks to the unassigned list.
5. **Verification**: Ensure no hallucinated data is added and source text is preserved.

## Error Handling
- Returns `insufficient_input` if `notes` is missing or empty.
- Returns `partial` if notes are provided but no actionable items or decisions are found.
- Returns `success` if structured data is successfully extracted.