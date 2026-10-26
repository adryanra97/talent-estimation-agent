# Data management

## No persistence by design

The system has no database and writes no files on the server. This removes a
whole class of risks (retention, access control, breaches of stored data) and
fits the free hosting tier. The consequences are handled explicitly:

| Concern | Handling |
|---|---|
| Where does a run live? | In the browser tab, as a `RunResult` JSON object. |
| How does review work across requests? | The browser sends the run back to `/recalculate`, `/reclassify`, or `/excel`. |
| What if the tab closes? | The run is lost. The UI warns before closing and offers the workbook download at all times. |
| Human-in-the-loop in LangGraph | No checkpointer is needed because review happens after the graph finishes; re-judging is a new request. |
| Uploaded files | Read into memory, parsed, discarded at the end of the request. Size limit 4 MB. |

## Data model

The full model is in `src/talent_estimation/domain/models.py`. The entity view:

```mermaid
erDiagram
    RUN ||--|| PROJECT : describes
    RUN ||--|| PARAMETERS : uses
    RUN ||--o{ WBS_ITEM : reads
    RUN ||--o{ BREAKDOWN_ROW : judges
    RUN ||--o{ ROLE_FACTORS : assesses
    RUN ||--o{ ROLE_INPUT : compares
    RUN ||--o{ ROLE_ESTIMATE : calculates
    RUN ||--o{ MONTHLY_FTE : distributes
    RUN ||--o{ FINDING : records
    RUN ||--o{ AI_TASK : maps
    WBS_ITEM ||--o{ BREAKDOWN_ROW : "one per role"
    BREAKDOWN_ROW ||--o{ AI_TASK : "split into"
    BREAKDOWN_ROW {
        string item_id
        string role
        string involvement
        string classification
        float allocation_fte
        bool needs_review
    }
    ROLE_ESTIMATE {
        string role
        float ucp_fte
        float bu_fte
        float ucp_peak_fte
        float bu_peak_fte
    }
    AI_TASK {
        string category
        float weight
        float saving
    }
```

## Future storage

If run history is stored later (for example evaluation results in DuckDB or
PostgreSQL), the natural centre is the run: one row per run with the versions
of the catalog, prompts, and parameters used, and child tables for breakdown
rows, estimates, findings, and decisions. dbt would then build analytical
models such as accuracy per provider over time. See
[ADR 0006](../adr/0006-dbt-deferred.md).
