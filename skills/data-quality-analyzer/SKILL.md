---
skill_name: Data Quality Analyzer
slug: data-quality-analyzer
category: Data Analysis
version: 1.0.0
---

# Data Quality Analyzer

## Overview
Analyzes a set of structured JSON records to identify duplicates, missing values, and invalid email formats. It provides a quantitative quality score and a detailed list of issues found within the dataset.

## Usage
Provide a list of dictionaries (records) containing fields such as `name`, `email`, and `age`. The analyzer will scan every record for completeness, uniqueness, and format validity.

### Inputs
- `records` (List[Dict]): A list of objects to be analyzed.

### Outputs
- `total_records` (Integer): Total count of records processed.
- `duplicate_count` (Integer): Number of records that are exact duplicates of a previous record.
- `missing_values` (Dict[String, Integer]): Mapping of field names to the count of null or empty values.
- `invalid_email_count` (Integer): Count of records with improperly formatted email addresses.
- `issues` (List[String]): Detailed descriptions of quality failures including record indices.
- `quality_score` (Float): A score from 0-100 based on data cleanliness.

## Steps
1. **Validation**: Ensure the input is a list of dictionaries.
2. **Duplicate Detection**: Identify records with identical values across all keys.
3. **Completeness Check**: Scan for `None` or empty string values across all fields.
4. **Format Validation**: Apply regex to the `email` field to ensure standard formatting.
5. **Scoring**: Calculate a deterministic quality score based on the ratio of clean records to total records, applying penalties for duplicates and missing data.

## Error Handling
- Returns a zero-score report if the input is not a list or is empty.
- Gracefully handles records that are missing the `email` key during email validation.