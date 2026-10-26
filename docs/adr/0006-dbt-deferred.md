# 0006 dbt deferred until run history is stored

Status: accepted

## Context
dbt transforms data inside a warehouse or database. This version has no
database by design (ADR 0001).

## Decision
Do not add dbt now. Revisit when evaluation results or run history are stored,
for example in DuckDB or PostgreSQL, and analytical models such as accuracy per
provider over time are needed.

## Consequences
No empty tooling in the repository. The data model in
[data management](../03-design/data-management.md) already identifies the run
as the centre of a future schema.
