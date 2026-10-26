# Requirements definition

## Functional requirements

| ID | Requirement |
|---|---|
| FR1 | The user uploads a WBS workbook (.xlsx). The system detects the table and keeps only leaf work packages. |
| FR2 | The user may upload a request document and a supporting document (.pdf, .docx, .txt, .md). |
| FR3 | The system reads the requested FTE per role and the project period from the request document. |
| FR4 | The user selects the role scope (Data, Design, All) and may override the period, the parameters, and the comparison figures per role. |
| FR5 | For each item and each role in scope, the system decides involvement (primary or supporting), class (Simple, Average, Complex), and FTE allocation, each with a reason. |
| FR6 | The system identifies UCP actors and factor ratings per role. A rating other than the neutral value requires written evidence. |
| FR7 | The system calculates UCP and bottom-up effort, average FTE, monthly FTE, and peak FTE per role. |
| FR8 | The system compares the additional need (total minus existing talent) with the request and states a conclusion per role. |
| FR9 | The reviewer agent sends rows with a large disagreement between methods back for another judgement, at most twice, and records findings: gaps, overlaps, data quality issues, and work outside the WBS. |
| FR10 | When enabled, the system splits rows into tasks, maps them to capabilities, and shows an AI assistance scenario per role without changing the baseline. |
| FR11 | The user edits involvement, class, allocation, review status, and saving percentages; all numbers are recalculated without calling a model. |
| FR12 | The user selects rows and asks the agent to judge them again with a comment. |
| FR13 | The user downloads a workbook with formulas, the breakdown, UCP sheets, monthly distribution, AI scenario, rubric, and findings. |
| FR14 | The system drafts a reply message from the calculated results. |
| FR15 | The user configures the model provider and key, and tests the connection. |
| FR16 | The user replaces the capability catalog for the session with a YAML, JSON, or Excel file. |
| FR17 | A demo mode runs the full flow on a fictional project without a key. |

## Nonfunctional requirements

| Type | ID | Requirement |
|---|---|---|
| Operational | NFR1 | Runs on Vercel free tier; a run completes within 300 seconds for a WBS of up to 150 leaf items. |
| Operational | NFR2 | Works with Google Gemini, Anthropic Claude, OpenAI, Azure OpenAI, and OpenAI-compatible endpoints without code changes. |
| Performance | NFR3 | Recalculation after an edit returns within one second for 300 rows. |
| Security | NFR4 | No uploaded file, key, or run is written to disk or a database on the server. |
| Security | NFR5 | The API key is sent per request in a header and never logged. |
| Security | NFR6 | E-mail addresses, phone numbers, and 16-digit ID numbers are masked before text is sent to a model, unless the user turns masking off. |
| Integrity | NFR7 | All numbers come from the calculation engine. The screen and the workbook agree to six decimals. |
| Usability | NFR8 | The interface follows the ten usability heuristics of Nielsen Norman Group. |
| Maintainability | NFR9 | Each skill has typed input and output, NumPy-style docstrings, and tests. |
| Cultural | NFR10 | The interface is in Indonesian; code and documentation are in English. |

## User stories

- As a talent operations user, I want to upload the WBS and the request and get a validated estimate, so that I do not have to write a prompt.
- As a reviewer, I want to see why each row was classified the way it was, so that I can agree or correct it quickly.
- As a reviewer, I want to change an allocation and see the totals update, so that I can test what-if scenarios.
- As a capability lead, I want to see which capabilities benefit most from AI assistance, so that I can plan training.
- As a developer, I want each agent to have a clear contract, so that I can connect it to a larger agent later.
- As a data scientist, I want to evaluate the agents against reviewed decisions, so that I can calibrate the parameters.
