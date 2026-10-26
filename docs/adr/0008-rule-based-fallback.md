# 0008 Rule-based fallback for every model skill

Status: accepted

## Context
The full flow should be testable without network access or keys, and the
application should be demonstrable without cost.

## Decision
Each model skill has a transparent rule-based implementation used when no
client is given: keyword matching against the catalog, step counting, the
midpoint of the allocation guide, and fixed task templates.

## Consequences
Demo mode and the test suite exercise the whole graph. The rule-based judge
also serves as a baseline in evaluation; a model should beat it.
