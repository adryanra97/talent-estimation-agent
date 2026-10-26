# 0002 Models judge, code calculates

Status: accepted

## Context
Language models are good at reading descriptions and explaining choices, and
unreliable at arithmetic. Numbers must be reproducible and auditable.

## Decision
Models return only judgements from closed sets (involvement, class,
allocation within a guide, actors, factor ratings with evidence, AI
categories). A single engine computes every number. The workbook stores
formulas that reproduce the engine, verified by a test.

## Consequences
The same inputs always give the same numbers. A reviewer can change a
judgement and see the effect immediately without a model call.
