# Testing

| Level | What | Where |
|---|---|---|
| Unit | Working-day arithmetic, weights, UCP and bottom-up by hand, monthly conservation, existing talent, AI scenario | `tests/test_calendar.py`, `tests/test_engine.py` |
| Unit | WBS reader, role legend without names, unrecognised layout, text extraction, masking | `tests/test_io.py` |
| Unit | Default and uploaded catalog | `tests/test_catalog.py` |
| Integration | Full graph in demo mode; full graph with a scripted model: reclassification loop, extra items, evidence rule, weight normalisation, closed categories | `tests/test_agents.py` |
| Integration | Workbook structure; formulas recalculated by LibreOffice equal the engine | `tests/test_excel.py` |
| System | API routes: health, catalog, key requirement, demo run stream, recalculation, workbook download, WBS preview | `tests/test_api.py` |
| Acceptance | Golden test against a hand-reviewed project workbook (kept outside the repository) | local |
| Evaluation | Accuracy per provider and PHM calibration | `evaluation/` |

Run everything with:

```bash
uv run pytest
```

The LibreOffice test is skipped when `soffice` is not installed. CI installs
LibreOffice so the test always runs there.

## Continuous integration

`.github/workflows/ci.yml` runs every check through
`.github/scripts/run-check.sh`, which records the result and keeps going when
a check fails. `.github/scripts/summary.sh` writes a table of results and the
log of each check to the job summary, then fails the job if any check failed.
The JUnit report (`pytest.xml`) and coverage report (`coverage.xml`) are
uploaded as artifacts.

## Golden test

The engine was first checked against the workbook used in the manual pilot.
For four roles, UCP hours, UCP FTE, UCP peak, bottom-up hours, bottom-up FTE,
and bottom-up peak matched the workbook to six decimals. The workbook and its
data are confidential and are not part of the repository.
