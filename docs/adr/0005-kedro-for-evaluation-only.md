# 0005 Kedro for evaluation, not for the runtime

Status: accepted

## Context
Kedro organises batch data pipelines around a data catalog that reads and
writes datasets. The runtime is a stateless request orchestrated by LangGraph.

## Decision
Use Kedro only for the offline evaluation pipeline: run agents on reviewed
cases, score them, and calibrate PHM.

## Consequences
One orchestrator per concern: LangGraph for agents, Kedro for evaluation.
Evaluation data stays local and out of git.
