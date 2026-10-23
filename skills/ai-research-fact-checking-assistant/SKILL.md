---
name: AI Research & Fact-Checking Assistant
slug: ai-research-fact-checking-assistant
category: Document Analysis
version: 1.0.0
---

# AI Research & Fact-Checking Assistant

## Overview
Analyzes provided text to separate factual claims from opinions, identify unsupported statements or contradictions, and specify the evidence required for verification. This skill operates as a closed-system analyzer, meaning it relies strictly on the provided input without external data retrieval.

## Usage

### Inputs
- `content` (string, required): The primary text, claims, or notes to be analyzed.
- `strict_mode` (boolean, optional): If true, increases the rigor of the analysis, marking claims as 'unsupported' more aggressively if evidence is not explicit.
- `context` (string, optional): Additional background information to aid the analysis.

### Outputs
- `overall_status` (string): 'analysis_complete', 'issues_found', or 'insufficient_input'.
- `summary` (string): High-level overview of findings.
- `claims` (array): List of objects containing:
    - `original_claim`: The text of the claim.
    - `classification`: 'factual', 'opinion', 'prediction', or 'ambiguous'.
    - `verification_status`: 'supported', 'unsupported', 'contradicted', or 'cannot_determine'.
    - `reasoning`: Explanation for the classification and status.
    - `required_evidence`: List of specific data points needed for verification.
- `contradictions` (array): List of conflicting statements found within the text.
- `missing_context` (array): Information required for a more reliable assessment.
- `limitations` (array): Constraints or caveats regarding the analysis.

## Steps
1. **Input Validation**: Check for empty or whitespace-only content.
2. **Claim Extraction**: Segment the text into individual assertions.
3. **Classification**: Determine if each assertion is a fact, opinion, prediction, or ambiguous.
4. **Cross-Reference**: Compare claims against each other and the provided context to find support or contradictions.
5. **Gap Analysis**: Identify what evidence is missing to move a claim from 'unsupported' to 'supported'.
6. **Synthesis**: Generate the final summary and status.

## Error Handling
- Returns `insufficient_input` if `content` is missing or empty.
- Handles `None` values for optional fields by treating them as empty strings or default booleans.