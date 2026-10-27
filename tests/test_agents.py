from talent_estimation.agents import MAX_REVIEW_ROUNDS, run_pipeline
from talent_estimation.domain.models import RunResult


async def collect(inputs, llm):
    events, result = [], None
    async for e in run_pipeline(inputs, llm):
        if e["type"] == "result":
            result = RunResult.model_validate(e["run"])
        else:
            events.append(e)
    return events, result


async def test_demo_pipeline(demo_inputs):
    events, run = await collect(demo_inputs, None)
    agents = {e["agent"] for e in events}
    assert {
        "Intake Agent",
        "Estimator Agent",
        "Reviewer Agent",
        "Augmentation Agent",
        "Report",
    } <= agents
    assert {c.role for c in run.comparisons} == {"DE", "DA", "DS", "AI", "UXR", "UX", "UI"}
    assert {r.requested_fte for r in run.role_inputs} == {1.0, 0.5}
    assert next(r for r in run.role_inputs if r.role == "DA").existing_fte == 0.5
    assert any(f.kind == "gap" and f.role == "UI" for f in run.findings)
    assert any(f.kind == "gap" for f in run.findings)
    assert run.ai_summary and run.message_draft
    order = list(dict.fromkeys(e["agent"] for e in events))
    assert order.index("Reviewer Agent") < order.index("Augmentation Agent") < order.index("Report")


async def test_llm_pipeline_with_review_loop(demo_inputs, scripted_llm):
    _, run = await collect(demo_inputs, scripted_llm)
    assert all(r.role in run.roles for r in run.breakdown), "roles outside the catalog are dropped"
    reclassified = next(r for r in run.breakdown if r.item_id == "2.1.2" and r.role == "DE")
    assert reclassified.classification == "Simple" and reclassified.allocation_fte == 0.3
    assert any(f.kind == "reclassified" for f in run.findings)
    extra = [r for r in run.breakdown if r.source == "additional"]
    assert extra and extra[0].needs_review and extra[0].workdays
    de = next(f for f in run.factors if f.role == "DE")
    assert de.ratings == {"T11": 4}, "rating without evidence is ignored"
    assert all(
        abs(sum(t.weight for t in run.ai_tasks if (t.item_id, t.role) == key) - 1) < 1e-9
        for key in {(t.item_id, t.role) for t in run.ai_tasks}
    )
    assert {t.category for t in run.ai_tasks} <= {"routine_code", "judgment"}
    assert scripted_llm.calls.count("check_quality") <= MAX_REVIEW_ROUNDS + 1
    assert run.message_draft == "Draf pesan uji."


async def test_low_time_budget_still_returns_a_result(demo_inputs, scripted_llm):
    inputs = demo_inputs.model_copy(update={"time_budget_s": 1.0})
    events, run = await collect(inputs, scripted_llm)
    assert run is not None and run.ai_tasks == []
    assert any(e["agent"] == "Augmentation Agent" and e["status"] == "skipped" for e in events)
    assert any("dilewati" in f.message for f in run.findings)
    assert "assess_ai_assist" not in scripted_llm.calls


async def test_failed_augmentation_keeps_the_estimate(demo_inputs, scripted_llm):
    from talent_estimation.llm import LLMError

    original = scripted_llm.structured

    async def structured(schema, system, user, *, skill):
        if skill == "assess_ai_assist":
            raise LLMError("Budget API key sudah habis.")
        return await original(schema, system, user, skill=skill)

    scripted_llm.structured = structured
    _, run = await collect(demo_inputs, scripted_llm)
    assert run.estimates and run.ai_tasks == []
    assert any("Analisis peluang bantuan AI dilewati" in f.message for f in run.findings)
