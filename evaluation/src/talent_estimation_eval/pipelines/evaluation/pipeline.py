"""Evaluation pipeline definition."""

from kedro.pipeline import Pipeline, node, pipeline

from talent_estimation_eval.pipelines.evaluation.nodes import (
    calibrate_phm,
    render_report,
    run_agents,
    score_runs,
)


def create_pipeline(**kwargs: object) -> Pipeline:
    """Create the evaluation pipeline.

    Returns
    -------
    Pipeline
        ``run_agents -> score_runs -> calibrate_phm -> render_report``.
    """
    return pipeline(
        [
            node(run_agents, ["cases", "params:providers", "params:parameters"], "runs", name="run_agents"),
            node(score_runs, ["runs", "cases"], "scores", name="score_runs"),
            node(calibrate_phm, ["runs", "cases"], "calibration", name="calibrate_phm"),
            node(render_report, ["scores", "calibration"], "report", name="render_report"),
        ]
    )
