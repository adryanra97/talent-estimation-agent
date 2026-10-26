# Behavioral model

## Sequence: a run

```mermaid
sequenceDiagram
    actor U as Talent Ops
    participant W as Web UI
    participant A as API
    participant G as Agent graph
    participant M as Model provider
    U->>W: Upload WBS and documents, start
    W->>A: POST /api/py/runs (files, settings, key header)
    A->>A: Read WBS and extract text in memory
    A->>G: run_pipeline(inputs, client)
    G->>M: parse_request
    G-->>W: progress (Intake)
    par batches
        G->>M: classify_item (batch 1..n)
    end
    G->>M: assess_factors (per role)
    G->>G: recalculate (code)
    par review and augmentation
        G->>M: check_quality
        G->>M: assess_ai_assist
    end
    opt rows to re-judge, at most twice
        G->>M: classify_item with feedback
        G->>M: check_quality
    end
    G->>M: draft_message
    G-->>A: result
    A-->>W: NDJSON stream: progress..., result
    W-->>U: Summary
```

## Sequence: review and export

```mermaid
sequenceDiagram
    actor R as Reviewer
    participant W as Web UI
    participant A as API
    R->>W: Change allocation
    W->>A: POST /api/py/recalculate (run)
    A-->>W: run (no model call)
    R->>W: Select rows, comment, ask agent
    W->>A: POST /api/py/reclassify (run, rows, key header)
    A-->>W: run
    R->>W: Download
    W->>A: POST /api/py/excel (run)
    A-->>W: .xlsx
```

## State machine of a run (in the browser)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Running: start
    Running --> Running: progress event
    Running --> Error: error event
    Running --> Idle: cancel
    Running --> Draft: result
    Draft --> Draft: edit or re-judge
    Draft --> Approved: approve
    Approved --> Draft: edit
    Error --> Running: retry
    Draft --> [*]: tab closed
    Approved --> [*]: tab closed
```

## CRUDE matrix

C = create, R = read, U = update, D = delete, E = execute.

| Actor or component | WbsItem | BreakdownRow | RoleFactors | RoleEstimate | Finding | AiTask | Workbook |
|---|---|---|---|---|---|---|---|
| Intake Agent | C | | | | | | |
| Estimator Agent | R | CU | C | | | | |
| Engine | | R | R | CU | | R | |
| Reviewer Agent | R | RU | | R | C | | |
| Augmentation Agent | | R | | | | C | |
| Report | | R | R | R | R | R | |
| ExcelBuilder | R | R | R | R | R | R | C |
| Reviewer (human) | R | RU | R | R | R | RU | E |
