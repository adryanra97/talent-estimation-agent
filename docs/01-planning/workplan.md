# Workplan

The project follows short iterations. Each iteration ends with something that
runs and can be shown.

```mermaid
gantt
    title Talent Estimation Agent
    dateFormat YYYY-MM-DD
    section Inception
    Prototype with prompt and template     :done, p0, 2026-10-14, 7d
    Concept (as-is, to-be)                 :done, p1, 2026-10-21, 3d
    section Elaboration
    Calculation engine and golden test     :done, e1, 2026-10-26, 1d
    Excel builder                          :done, e2, after e1, 1d
    section Construction
    Agents and LLM layer                   :done, c1, after e2, 1d
    API and UI                             :done, c2, after c1, 1d
    Evaluation pipeline                    :done, c3, after c2, 1d
    section Transition
    Deployment to Vercel                   :t1, after c3, 2d
    Pilot with real projects               :t2, after t1, 14d
    Calibration with reviewed cases        :t3, after t2, 7d
```

## Work breakdown structure

| ID | Task | Deliverable |
|---|---|---|
| 1 | Planning | System request, feasibility, estimate |
| 2 | Analysis | Requirements, use cases, structural and behavioral models |
| 3 | Design | Architecture, agent contracts, UI design |
| 4.1 | Engine | `calc` package with golden test |
| 4.2 | Excel | `excel` package with LibreOffice recalculation test |
| 4.3 | Agents | `agents`, `skills`, `llm` packages |
| 4.4 | API | `api/index.py` |
| 4.5 | UI | Next.js application |
| 4.6 | Evaluation | Kedro project |
| 5 | Transition | Deployment, pilot, calibration |

## Risks

| Risk | Likelihood | Impact | Response |
|---|---|---|---|
| Model output varies between providers | High | Medium | Schema validation, retries, evaluation per provider |
| PHM calibrated on too few projects | High | High | Kedro calibration as soon as reviewed cases exist |
| WBS formats not recognised | Medium | Medium | Clear error message listing the expected columns; column inference planned |
| Results read as a headcount cut | Medium | High | Separate AI scenario; mandatory human review |
