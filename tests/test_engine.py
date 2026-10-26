from datetime import date

import pytest

from talent_estimation.calc import recalculate
from talent_estimation.calc.engine import analysis_duration, effective_weight, factor_totals
from talent_estimation.domain.models import (
    Actor,
    AiTask,
    BreakdownRow,
    Parameters,
    ProjectInfo,
    RoleFactors,
    RoleInput,
    RunResult,
)


def row(**kw):
    base = dict(
        item_id="1.1.1",
        item_name="Integrasi",
        start=date(2027, 2, 1),
        end=date(2027, 2, 26),
        workdays=20,
        role="DE",
        involvement="Utama",
        classification="Average",
        allocation_fte=0.5,
    )
    base.update(kw)
    return BreakdownRow(**base)


def make_run(**kw):
    base = dict(
        project=ProjectInfo(start=date(2027, 2, 1), end=date(2027, 3, 31)),
        roles=["DE"],
        breakdown=[
            row(),
            row(
                item_id="1.1.2",
                involvement="Pendukung",
                classification="Complex",
                start=date(2027, 3, 1),
                end=date(2027, 3, 31),
                workdays=23,
                allocation_fte=0.2,
            ),
        ],
        factors=[
            RoleFactors(role="DE", actors=[Actor(name="Sumber", category="Average", count=2)])
        ],
        role_inputs=[RoleInput(role="DE", requested_fte=1.0)],
    )
    base.update(kw)
    return recalculate(RunResult(**base))


def test_neutral_factors():
    _, tcf, _, ef = factor_totals(RoleFactors(role="DE"))
    assert tcf == pytest.approx(1.02)
    assert ef == pytest.approx(1.4 - 0.03 * 13.5)


def test_weights_and_duration():
    p = Parameters()
    assert effective_weight(row(), p) == 10
    assert (
        effective_weight(row(involvement="Pendukung", classification="Complex", quantity=2), p)
        == 7.5
    )
    assert analysis_duration(ProjectInfo(start=date(2027, 2, 1), end=date(2027, 3, 31)), p) == 2
    assert analysis_duration(ProjectInfo(), Parameters(duration_override_months=1.5)) == 1.5


def test_ucp_and_bottom_up_by_hand():
    run = make_run()
    e = run.estimates[0]
    uucp = 4 + 10 + 15 * 0.25
    _, tcf, _, ef = factor_totals(RoleFactors(role="DE"))
    hours = uucp * tcf * ef * 9
    assert e.ucp_hours == pytest.approx(hours)
    assert e.ucp_fte == pytest.approx(hours / 8 / 20 / 2)
    assert e.bu_person_days == pytest.approx(20 * 0.5 + 23 * 0.2)
    assert e.bu_fte == pytest.approx((20 * 0.5 + 23 * 0.2) / 20 / 2)


def test_monthly_distribution_conserves_effort():
    run = make_run()
    capacity = {m.month: m.capacity_days for m in run.monthly}
    spread = sum(m.bottom_up["DE"] * capacity[m.month] for m in run.monthly)
    assert spread == pytest.approx(run.estimates[0].bu_person_days)
    assert run.estimates[0].bu_peak_fte == max(m.bottom_up["DE"] for m in run.monthly)


def test_existing_talent_reduces_additional_need():
    run = make_run(role_inputs=[RoleInput(role="DE", requested_fte=0.1, existing_fte=0.2)])
    c = run.comparisons[0]
    assert c.ucp_additional_fte == pytest.approx(max(c.ucp_fte - 0.2, 0))
    assert c.conclusion


def test_ai_scenario_uses_task_weights():
    tasks = [
        AiTask(
            item_id="1.1.1", role="DE", task="kode", weight=0.5, category="routine_code", saving=0.2
        )
    ]
    run = make_run(ai_tasks=tasks)
    a = run.ai_summary[0]
    assert a.saved_person_days == pytest.approx(10 * 0.5 * 0.2)
    assert a.bu_fte_assisted == pytest.approx(a.bu_fte * (1 - a.saving_share))
