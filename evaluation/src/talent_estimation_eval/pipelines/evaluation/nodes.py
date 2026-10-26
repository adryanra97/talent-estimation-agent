"""Nodes of the evaluation pipeline.

Each case is a project whose staffing was reviewed by a lead. The pipeline
runs the agents on it with every configured provider, measures the error
against the reviewed FTE per role, and finds the PHM that minimises the
squared error of the Use Case Points method.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any

import pandas as pd

from talent_estimation.agents import RunInputs, run_pipeline
from talent_estimation.catalog import load_default_catalog
from talent_estimation.demo import NOTES_TEXT, PROJECT_NAME, REQUEST_TEXT, build_demo_wbs
from talent_estimation.domain.models import Parameters, ProjectInfo, RunResult
from talent_estimation.io import extract_text, read_wbs
from talent_estimation.llm import LangChainClient, ProviderConfig


def _inputs(case: dict[str, Any], parameters: dict[str, float]) -> RunInputs:
    if case.get("source") == "demo":
        wbs, request, notes, name = build_demo_wbs(), REQUEST_TEXT, NOTES_TEXT, PROJECT_NAME
    else:
        folder = Path(case["folder"])
        wbs = (folder / case["wbs"]).read_bytes()
        request = extract_text(case["request"], (folder / case["request"]).read_bytes()) if case.get("request") else ""
        notes = extract_text(case["supporting"], (folder / case["supporting"]).read_bytes()) if case.get("supporting") else ""
        name = case["name"]
    parsed = read_wbs(wbs)
    return RunInputs(
        project=ProjectInfo(name=name, context=case.get("context", "")),
        parameters=Parameters(**parameters),
        items=parsed.items,
        legend=parsed.role_legend,
        request_text=request,
        supporting_text=notes,
        catalog=load_default_catalog(),
    )


async def _run(inputs: RunInputs, client: Any) -> dict[str, Any]:
    async for event in run_pipeline(inputs, client):
        if event["type"] == "result":
            return event["run"]
    raise RuntimeError("Run selesai tanpa hasil.")


def run_agents(
    cases: list[dict[str, Any]],
    providers: list[dict[str, Any]],
    parameters: dict[str, float],
) -> list[dict[str, Any]]:
    """Run every case with every provider.

    Parameters
    ----------
    cases : list of dict
        Evaluation cases.
    providers : list of dict
        Provider settings. ``provider: demo`` uses the rule-based judge. Other
        providers read their key from the environment variable ``api_key_env``.
    parameters : dict
        Calculation parameters.

    Returns
    -------
    list of dict
        One record per case and provider with the serialised run.
    """
    records = []
    for provider in providers:
        client = None
        if provider["provider"] != "demo":
            key = os.environ.get(provider["api_key_env"], "")
            if not key:
                raise RuntimeError(f"Set the environment variable {provider['api_key_env']}.")
            config = ProviderConfig(**{k: v for k, v in provider.items() if k in ProviderConfig.model_fields})
            client = LangChainClient(config, key)
        for case in cases:
            run = asyncio.run(_run(_inputs(case, parameters), client))
            records.append({"case": case["name"], "provider": provider["name"], "run": run})
    return records


def score_runs(runs: list[dict[str, Any]], cases: list[dict[str, Any]]) -> pd.DataFrame:
    """Compare the FTE of each role with the reviewed reference.

    Returns
    -------
    pandas.DataFrame
        One row per case, provider, and role with absolute and relative errors.
    """
    references = {c["name"]: c["reference_fte"] for c in cases}
    rows = []
    for record in runs:
        run = RunResult.model_validate(record["run"])
        for estimate in run.estimates:
            reference = references[record["case"]].get(estimate.role)
            if reference is None:
                continue
            for method, value in (("ucp", estimate.ucp_fte), ("bottom_up", estimate.bu_fte)):
                rows.append(
                    {
                        "case": record["case"],
                        "provider": record["provider"],
                        "role": estimate.role,
                        "method": method,
                        "fte": round(value, 4),
                        "reference_fte": reference,
                        "abs_error": round(abs(value - reference), 4),
                        "pct_error": round((value - reference) / reference, 4) if reference else None,
                    }
                )
    return pd.DataFrame(rows)


def calibrate_phm(runs: list[dict[str, Any]], cases: list[dict[str, Any]]) -> dict[str, Any]:
    """Find the PHM that best matches the reviewed FTE.

    UCP FTE is proportional to PHM, so for observations ``k_i * PHM`` against
    references ``r_i`` the least-squares solution is
    ``PHM = sum(k_i * r_i) / sum(k_i ** 2)``.

    Returns
    -------
    dict
        Calibrated PHM per provider and the number of observations used.
    """
    references = {c["name"]: c["reference_fte"] for c in cases}
    result: dict[str, Any] = {}
    by_provider: dict[str, list[tuple[float, float]]] = {}
    for record in runs:
        run = RunResult.model_validate(record["run"])
        for estimate in run.estimates:
            reference = references[record["case"]].get(estimate.role)
            if reference is None or not estimate.ucp_fte:
                continue
            k = estimate.ucp_fte / run.parameters.phm
            by_provider.setdefault(record["provider"], []).append((k, reference))
    for provider, pairs in by_provider.items():
        denominator = sum(k * k for k, _ in pairs)
        phm = sum(k * r for k, r in pairs) / denominator if denominator else None
        result[provider] = {"phm": round(phm, 2) if phm else None, "observations": len(pairs)}
    return result


def render_report(scores: pd.DataFrame, calibration: dict[str, Any]) -> str:
    """Write a short Markdown report of the evaluation."""
    lines = ["# Laporan evaluasi", ""]
    if scores.empty:
        lines.append("Tidak ada kasus dengan referensi.")
        return "\n".join(lines)
    summary = scores.groupby(["provider", "method"])["abs_error"].mean().reset_index()
    lines += ["## Rata-rata galat absolut (FTE)", "", "| Provider | Metode | MAE |", "|---|---|---|"]
    for _, row in summary.iterrows():
        lines.append(f"| {row['provider']} | {row['method']} | {row['abs_error']:.3f} |")
    lines += ["", "## Kalibrasi PHM", "", "| Provider | PHM | Observasi |", "|---|---|---|"]
    for provider, item in calibration.items():
        lines.append(f"| {provider} | {item['phm']} | {item['observations']} |")
    lines += [
        "",
        "Kalibrasi hanya bermakna bila kasus cukup banyak dan referensinya hasil review, "
        "bukan permintaan awal.",
    ]
    return "\n".join(lines)
