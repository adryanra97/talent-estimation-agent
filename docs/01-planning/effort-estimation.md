# Effort estimation with Use Case Points

The method that the application uses is applied here to the application
itself, as in chapter 2 of the textbook.

## Unadjusted actor weight

| Actor | Type | Weight |
|---|---|---|
| Talent operations user | Complex (human through a UI) | 3 |
| Reviewer or lead | Complex (human through a UI) | 3 |
| Model provider API | Average (protocol, external system) | 2 |
| Spreadsheet application (Excel) | Simple (file format) | 1 |
| **UAW** | | **9** |

## Unadjusted use case weight

| Use case | Class | Weight |
|---|---|---|
| UC1 Validate a talent request | Complex | 15 |
| UC2 Review and correct the breakdown | Average | 10 |
| UC3 Ask the agent to re-judge rows | Average | 10 |
| UC4 Export the validation workbook | Average | 10 |
| UC5 Configure the model provider | Simple | 5 |
| UC6 Replace the capability catalog | Simple | 5 |
| UC7 Run the demo | Simple | 5 |
| UC8 Evaluate and calibrate | Average | 10 |
| **UUCW** | | **70** |

UUCP = 9 + 70 = 79.

## Adjustment factors

All factors are rated 3 except T4 (complex internal processing) and T11
(security), rated 4 because of agent orchestration and the handling of
project documents.

- TFactor = 3 x 14 + 1 + 1 = 44, so TCF = 0.6 + 0.01 x 44 = 1.04.
- EFactor = 3 x 4.5 = 13.5, so EF = 1.4 - 0.03 x 13.5 = 0.995.
- UCP = 79 x 1.04 x 0.995 = 81.7.

## Effort

| PHM | Hours | Person-days (8 h) | Person-months (20 d) |
|---|---|---|---|
| 20 (Karner) | 1,635 | 204 | 10.2 |
| 15 (application default) | 1,226 | 153 | 7.7 |

The application defaults to 15, the low end of the literature range, because
WBS items are usually smaller than full software use cases. This project is a
software project, so the literature value of 20 is the appropriate one here. The difference is a reminder that
PHM is a property of the kind of work being estimated, not a universal
constant.
