# Feasibility analysis

## Technical feasibility

| Risk | Assessment | Mitigation |
|---|---|---|
| Familiarity with the application | Medium. The estimation method was already tested by hand on one project. | Golden test: the engine must reproduce the hand-made workbook to six decimals. |
| Familiarity with the technology | Medium. LangGraph and Vercel Python functions are recent. | Small graph; every LLM skill has a rule-based fallback, so the whole flow can be tested without a model. |
| Project size | Small: one developer, a few weeks. | Iterative delivery: engine, Excel, agents, UI. |
| Compatibility | WBS files differ between teams. | Header detection by keywords and leaf detection by ID hierarchy. Model-based column inference is planned for layouts that are not recognised. |
| Platform limits | Vercel functions on the free plan run at most 300 seconds with a 4.5 MB body limit. | Items are judged in concurrent batches; uploads are limited to 4 MB. |

## Economic feasibility

| Item | Cost |
|---|---|
| Hosting (Vercel Hobby, GitHub public repository) | Free |
| Model usage | Paid by the user's own key. A typical run of 50-80 WBS items needs roughly 10-20 model calls. |
| Development | Personal time |

Benefits are qualitative in this version: shorter validation time, consistent
reasoning, and an explicit record of assumptions.

## Organizational feasibility

The champion is the capability lead who asked for a measurable method. Users
are talent operations staff, who benefit from not writing prompts. The main
organizational risk is that results are read as a mechanism to cut headcount.
The design addresses this by keeping the AI scenario separate from the
baseline, by showing reasons for every number, and by requiring human review
before results are used.
