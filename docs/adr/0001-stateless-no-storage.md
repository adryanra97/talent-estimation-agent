# 0001 Stateless server, no storage

Status: accepted

## Context
Project documents may contain personal and confidential data. The first
deployment is a public mock-up on free hosting.

## Decision
The server keeps nothing between requests: no database, no file writes, no
LangGraph checkpointer. The browser holds the run and sends it back when it
needs recalculation, re-judgement, or a workbook.

## Consequences
No retention risk on the server. A closed tab loses the run, so the UI warns
before closing and offers the workbook at all times. History and analytics
need a separate, explicit decision (see ADR 0006).
