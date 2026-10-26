"""Register the project's pipelines."""

from kedro.pipeline import Pipeline

from talent_estimation_eval.pipelines import evaluation


def register_pipelines() -> dict[str, Pipeline]:
    """Return the pipelines of the project.

    Returns
    -------
    dict of str to Pipeline
        The evaluation pipeline, also registered as the default.
    """
    pipeline = evaluation.create_pipeline()
    return {"evaluation": pipeline, "__default__": pipeline}
