---
name: data-quality-detector
category: Data Analysis
version: 1.0.1
execution_strategy: restricted_python
---
# Tabular Data Quality & Outlier Detector

## Purpose
Examines rows of tabular data to ensure data hygiene, identify incomplete inputs, and flag statistically significant anomalies.

## Inputs
- `rows`: List of dictionaries
- `numeric_column`: String key name

## Outputs
- `row_count`: Total evaluated rows
- `mean`: Average value of clean numeric data
- `std_dev`: Population standard deviation
- `missing_count`: Count of empty or non-numeric cells
- `outliers`: Array of numbers deviating by > 2 sigma
