"""Deterministic estimation engine.

This module is the single source of truth for every number in the system. It
reproduces the formulas of the Excel workbook so that the screen and the
downloaded file always agree. Language models never calculate.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from talent_estimation.calc.calendar import (
    duration_months,
    end_of_month,
    month_starts,
    networkdays,
)
from talent_estimation.domain.models import (
    EF_FACTORS,
    TCF_FACTORS,
    AiAssessment,
    AiTask,
    BreakdownRow,
    Comparison,
    MonthlyFte,
    Parameters,
    ProjectInfo,
    RoleEstimate,
    RoleFactors,
    RoleInput,
    RunResult,
)


def analysis_duration(project: ProjectInfo, params: Parameters) -> float:
    """Return the analysis duration in months.

    Parameters
    ----------
    project : ProjectInfo
        Project with start and end dates.
    params : Parameters
        Parameters that may override the duration.

    Returns
    -------
    float
        Duration in months, or 0 when dates are missing.
    """
    if params.duration_override_months:
        return float(params.duration_override_months)
    if project.start is None or project.end is None:
        return 0.0
    return float(duration_months(project.start, project.end))


def base_weight(row: BreakdownRow, params: Parameters) -> float:
    """Return the use case weight of a row's classification."""
    return params.use_case_weights[row.classification]


def effective_weight(row: BreakdownRow, params: Parameters) -> float:
    """Return the UCP weight a row contributes to its role.

    Parameters
    ----------
    row : BreakdownRow
        Breakdown row.
    params : Parameters
        Calculation parameters.

    Returns
    -------
    float
        ``weight * quantity``, multiplied by the support factor when the role
        only supports the item.
    """
    factor = params.support_factor if row.involvement == "Pendukung" else 1.0
    return base_weight(row, params) * row.quantity * factor


def bottom_up_person_days(row: BreakdownRow) -> float:
    """Return bottom-up person-days of a row: workdays x allocation x quantity."""
    if row.workdays is None:
        return 0.0
    return row.workdays * row.allocation_fte * row.quantity


def factor_totals(factors: RoleFactors) -> tuple[float, float, float, float]:
    """Return the technical and environmental totals of a role.

    Returns
    -------
    tuple of float
        ``(tfactor, tcf, efactor, ef)`` where ``tcf = 0.6 + 0.01 * tfactor`` and
        ``ef = 1.4 - 0.03 * efactor``.
    """
    tfactor = sum(weight * factors.rating(code) for code, _, weight in TCF_FACTORS)
    efactor = sum(weight * factors.rating(code) for code, _, weight in EF_FACTORS)
    return tfactor, 0.6 + 0.01 * tfactor, efactor, 1.4 - 0.03 * efactor


def estimate_role(
    role: str,
    rows: list[BreakdownRow],
    factors: RoleFactors,
    params: Parameters,
    duration: float,
) -> RoleEstimate:
    """Estimate one role with Use Case Points and the bottom-up method.

    Parameters
    ----------
    role : str
        Role code.
    rows : list of BreakdownRow
        Breakdown rows of this role.
    factors : RoleFactors
        Actors and factor ratings of this role.
    params : Parameters
        Calculation parameters.
    duration : float
        Analysis duration in months.

    Returns
    -------
    RoleEstimate
        Effort and FTE from both methods. Peak values are filled later by
        :func:`monthly_distribution`.
    """
    uaw = sum(params.actor_weights[a.category] * a.count for a in factors.actors)
    uucw = sum(effective_weight(r, params) for r in rows)
    uucp = uaw + uucw
    tfactor, tcf, efactor, ef = factor_totals(factors)
    ucp = uucp * tcf * ef
    ucp_hours = ucp * params.phm
    ucp_days = ucp_hours / params.hours_per_day
    ucp_months = ucp_days / params.days_per_month
    bu_days = sum(bottom_up_person_days(r) for r in rows)
    bu_months = bu_days / params.days_per_month
    return RoleEstimate(
        role=role,
        rows=len(rows),
        uaw=uaw,
        uucw=uucw,
        uucp=uucp,
        tfactor=tfactor,
        tcf=tcf,
        efactor=efactor,
        ef=ef,
        ucp=ucp,
        ucp_hours=ucp_hours,
        ucp_person_days=ucp_days,
        ucp_person_months=ucp_months,
        ucp_fte=ucp_months / duration if duration else 0.0,
        bu_person_days=bu_days,
        bu_hours=bu_days * params.hours_per_day,
        bu_person_months=bu_months,
        bu_fte=bu_months / duration if duration else 0.0,
    )


def ucp_person_days_by_row(
    breakdown: list[BreakdownRow],
    estimates: dict[str, RoleEstimate],
    params: Parameters,
) -> dict[str, float]:
    """Allocate each role's UCP effort to its rows in proportion to their weight.

    Returns
    -------
    dict
        Person-days keyed by :attr:`BreakdownRow.key`.
    """
    totals: dict[str, float] = defaultdict(float)
    for row in breakdown:
        totals[row.role] += effective_weight(row, params)
    result: dict[str, float] = {}
    for row in breakdown:
        estimate = estimates.get(row.role)
        total = totals[row.role]
        if estimate is None or total == 0:
            result[row.key] = 0.0
            continue
        hours = effective_weight(row, params) / total * estimate.ucp_hours
        result[row.key] = hours / params.hours_per_day
    return result


def _share_in_month(row: BreakdownRow, month: date, holidays: list[date]) -> float:
    if row.start is None or row.end is None:
        return 0.0
    total = networkdays(row.start, row.end, holidays)
    if total <= 0:
        return 0.0
    lo = max(row.start, month)
    hi = min(row.end, end_of_month(month))
    if lo > hi:
        return 0.0
    return networkdays(lo, hi, holidays) / total


def monthly_distribution(
    project: ProjectInfo,
    params: Parameters,
    roles: list[str],
    breakdown: list[BreakdownRow],
    ucp_days: dict[str, float],
) -> list[MonthlyFte]:
    """Spread person-days over calendar months and convert them to FTE.

    Each row's effort is distributed by the share of its working days that
    falls in each month. Monthly FTE is person-days divided by the working days
    of the month inside the analysis period.

    Returns
    -------
    list of MonthlyFte
        One entry per month of the analysis period (at most 24).
    """
    if project.start is None or project.end is None:
        return []
    result: list[MonthlyFte] = []
    for month in month_starts(project.start, project.end):
        capacity = networkdays(
            max(month, project.start), min(end_of_month(month), project.end), params.holidays
        )
        ucp_month: dict[str, float] = dict.fromkeys(roles, 0.0)
        bu_month: dict[str, float] = dict.fromkeys(roles, 0.0)
        for row in breakdown:
            if row.role not in ucp_month:
                continue
            share = _share_in_month(row, month, params.holidays)
            ucp_month[row.role] += ucp_days.get(row.key, 0.0) * share
            bu_month[row.role] += bottom_up_person_days(row) * share
        result.append(
            MonthlyFte(
                month=month,
                capacity_days=capacity,
                ucp={r: (v / capacity if capacity else 0.0) for r, v in ucp_month.items()},
                bottom_up={r: (v / capacity if capacity else 0.0) for r, v in bu_month.items()},
            )
        )
    return result


def _versus(value: float, requested: float | None, tolerance: float) -> str | None:
    if requested is None:
        return None
    if value < requested * (1 - tolerance):
        return "Lebih rendah"
    if value > requested * (1 + tolerance):
        return "Lebih tinggi"
    return "Selaras"


def _conclusion(ucp_vs: str | None, bu_vs: str | None) -> str:
    if ucp_vs is None or bu_vs is None:
        return "Isi FTE yang diminta untuk melihat kesimpulan"
    if ucp_vs == bu_vs == "Lebih rendah":
        return "Kebutuhan tambahan lebih rendah dari permintaan (kedua metode)"
    if ucp_vs == bu_vs == "Lebih tinggi":
        return "Kebutuhan tambahan lebih tinggi dari permintaan (kedua metode)"
    if ucp_vs == bu_vs == "Selaras":
        return "Selaras dengan permintaan"
    return "Dua metode tidak sepakat, perlu review manual"


def compare(estimate: RoleEstimate, role_input: RoleInput, params: Parameters) -> Comparison:
    """Compare calculated need with the request for one role.

    The additional need is the calculated FTE minus the existing talent. It is
    the figure compared with the requested FTE, because a request usually
    covers only additional people.
    """
    ucp_add = max(estimate.ucp_fte - role_input.existing_fte, 0.0)
    bu_add = max(estimate.bu_fte - role_input.existing_fte, 0.0)
    ucp_vs = _versus(ucp_add, role_input.requested_fte, params.tolerance)
    bu_vs = _versus(bu_add, role_input.requested_fte, params.tolerance)
    divergence = (
        (estimate.ucp_fte - estimate.bu_fte) / estimate.bu_fte
        if estimate.bu_fte and estimate.ucp_fte
        else None
    )
    return Comparison(
        role=estimate.role,
        requested_fte=role_input.requested_fte,
        existing_fte=role_input.existing_fte,
        reference_fte=role_input.reference_fte,
        ucp_fte=estimate.ucp_fte,
        bu_fte=estimate.bu_fte,
        ucp_additional_fte=ucp_add,
        bu_additional_fte=bu_add,
        divergence=divergence,
        ucp_vs_requested=ucp_vs,
        bu_vs_requested=bu_vs,
        conclusion=_conclusion(ucp_vs, bu_vs),
    )


def ai_scenario(
    breakdown: list[BreakdownRow],
    tasks: list[AiTask],
    estimates: dict[str, RoleEstimate],
) -> list[AiAssessment]:
    """Summarise the AI assistance scenario per role.

    For every row, the saving is the weighted sum of task savings. Saved
    person-days are taken from the bottom-up effort of the row. The resulting
    share of saved effort per role is applied to both methods.

    Returns
    -------
    list of AiAssessment
        One entry per role that has an estimate.
    """
    tasks_by_row: dict[str, list[AiTask]] = defaultdict(list)
    for task in tasks:
        tasks_by_row[f"{task.item_id}|{task.role}"].append(task)
    base: dict[str, float] = defaultdict(float)
    saved: dict[str, float] = defaultdict(float)
    skills: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for row in breakdown:
        days = bottom_up_person_days(row)
        base[row.role] += days
        for task in tasks_by_row.get(row.key, []):
            amount = days * task.weight * task.saving
            saved[row.role] += amount
            if amount > 0:
                label = f"{task.pillar} · {task.skill}" if task.skill else task.pillar
                skills[row.role][label] += amount
    result: list[AiAssessment] = []
    for role, estimate in estimates.items():
        share = saved[role] / base[role] if base[role] else 0.0
        ranked = sorted(skills[role].items(), key=lambda kv: kv[1], reverse=True)
        result.append(
            AiAssessment(
                role=role,
                baseline_person_days=base[role],
                saved_person_days=saved[role],
                saving_share=share,
                ucp_fte=estimate.ucp_fte,
                ucp_fte_assisted=estimate.ucp_fte * (1 - share),
                bu_fte=estimate.bu_fte,
                bu_fte_assisted=estimate.bu_fte * (1 - share),
                top_skills=[label for label, _ in ranked[:5]],
            )
        )
    return result


def recalculate(run: RunResult) -> RunResult:
    """Recompute every derived number of a run from its inputs.

    Parameters
    ----------
    run : RunResult
        Run with project, parameters, breakdown, factors, role inputs, and AI
        tasks. Derived fields are overwritten.

    Returns
    -------
    RunResult
        A new run object with estimates, monthly distribution, comparisons, and
        the AI scenario recalculated.
    """
    params = run.parameters
    duration = analysis_duration(run.project, params)
    factors = {f.role: f for f in run.factors}
    inputs = {i.role: i for i in run.role_inputs}
    estimates: dict[str, RoleEstimate] = {}
    for role in run.roles:
        rows = [r for r in run.breakdown if r.role == role]
        estimates[role] = estimate_role(
            role, rows, factors.get(role, RoleFactors(role=role)), params, duration
        )
    ucp_days = ucp_person_days_by_row(run.breakdown, estimates, params)
    monthly = monthly_distribution(run.project, params, run.roles, run.breakdown, ucp_days)
    for role, estimate in estimates.items():
        estimate.ucp_peak_fte = max((m.ucp.get(role, 0.0) for m in monthly), default=0.0)
        estimate.bu_peak_fte = max((m.bottom_up.get(role, 0.0) for m in monthly), default=0.0)
    comparisons = [
        compare(estimates[role], inputs.get(role, RoleInput(role=role)), params)
        for role in run.roles
    ]
    ai_summary = ai_scenario(run.breakdown, run.ai_tasks, estimates) if run.ai_enabled else []
    return run.model_copy(
        update={
            "estimates": list(estimates.values()),
            "monthly": monthly,
            "comparisons": comparisons,
            "ai_summary": ai_summary,
        }
    )
