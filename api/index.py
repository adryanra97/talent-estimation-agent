"""HTTP API served as a Vercel Python Function.

The API is stateless. Uploaded files and the API key live only for the
duration of a request. The browser holds the run and sends it back when it
needs a recalculation, a reclassification, or an Excel file.

Routes are mounted under ``/api/py`` so the Next.js app can proxy them.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Annotated, Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field, ValidationError

from talent_estimation import __version__
from talent_estimation.agents import RunInputs, reclassify_rows, run_pipeline
from talent_estimation.calc import recalculate
from talent_estimation.catalog import Catalog, load_catalog_file, load_default_catalog
from talent_estimation.demo import NOTES_TEXT, PROJECT_NAME, REQUEST_TEXT, build_demo_wbs
from talent_estimation.domain.models import (
    Parameters,
    ProjectInfo,
    RoleInput,
    RunResult,
)
from talent_estimation.excel import build_workbook
from talent_estimation.io import WbsFormatError, extract_text, read_wbs
from talent_estimation.llm import (
    LangChainClient,
    LLMClient,
    LLMError,
    ProviderConfig,
    test_connection,
)
from talent_estimation.skills import AGENT_CARDS
from talent_estimation.skills.schemas import ReclassifyRequest

MAX_UPLOAD_BYTES = 4 * 1024 * 1024

app = FastAPI(
    title="Talent Estimation Agent API",
    version=__version__,
    docs_url="/api/py/docs",
    openapi_url="/api/py/openapi.json",
)


class RunSettings(BaseModel):
    """Settings sent with a new run."""

    project: ProjectInfo = Field(default_factory=ProjectInfo)
    parameters: Parameters = Field(default_factory=Parameters)
    role_inputs: list[RoleInput] = Field(default_factory=list)
    ai_enabled: bool = True
    ai_tools: list[str] = Field(default_factory=list)
    provider: ProviderConfig = Field(default_factory=ProviderConfig)
    demo: bool = False
    catalog: Catalog | None = None


class RunEnvelope(BaseModel):
    """A run sent back by the browser, with the catalog it was produced with."""

    run: RunResult
    catalog: Catalog | None = None


class ReclassifyBody(RunEnvelope):
    """Rows chosen by a human reviewer for another judgement."""

    requests: list[ReclassifyRequest]
    provider: ProviderConfig = Field(default_factory=ProviderConfig)
    demo: bool = False


def _client(provider: ProviderConfig, api_key: str | None, demo: bool) -> LLMClient | None:
    if demo:
        return None
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="API key belum diisi. Buka Pengaturan untuk mengisi key, atau pakai mode demo.",
        )
    try:
        return LangChainClient(provider, api_key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def _read(upload: UploadFile | None) -> bytes | None:
    if upload is None:
        return None
    content = await upload.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File {upload.filename} lebih dari 4 MB.")
    return content


@app.get("/api/py/health")
def health() -> dict[str, str]:
    """Report that the API is running."""
    return {"status": "ok", "version": __version__}


@app.get("/api/py/catalog")
def default_catalog() -> dict[str, Any]:
    """Return the default capability catalog."""
    return load_default_catalog().model_dump(mode="json")


@app.post("/api/py/catalog/parse")
async def parse_catalog(file: Annotated[UploadFile, File()]) -> dict[str, Any]:
    """Parse an uploaded catalog file and return it. Nothing is stored."""
    content = await _read(file)
    try:
        return load_catalog_file(file.filename or "", content or b"").model_dump(mode="json")
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=f"Katalog tidak valid: {exc}") from exc


@app.get("/api/py/agents")
def agents() -> list[dict[str, Any]]:
    """Return the agent cards."""
    return [card.model_dump() for card in AGENT_CARDS]


@app.post("/api/py/llm/test")
async def llm_test(
    provider: ProviderConfig,
    x_llm_api_key: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    """Check that the key and endpoint answer a minimal prompt."""
    if not x_llm_api_key:
        raise HTTPException(status_code=400, detail="API key belum diisi.")
    try:
        reply = await test_connection(provider, x_llm_api_key)
    except (LLMError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"status": "ok", "reply": reply}


@app.post("/api/py/wbs/preview")
async def wbs_preview(file: Annotated[UploadFile, File()]) -> dict[str, Any]:
    """Read a WBS file and report what was recognised, before a run starts."""
    content = await _read(file)
    try:
        result = read_wbs(content or b"")
    except WbsFormatError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"File tidak bisa dibaca: {exc}") from exc
    starts = [i.start for i in result.items if i.start]
    ends = [i.end for i in result.items if i.end]
    return {
        "sheet": result.mapping.sheet,
        "items": len(result.items),
        "rows": result.total_rows,
        "start": min(starts).isoformat() if starts else None,
        "end": max(ends).isoformat() if ends else None,
        "warnings": result.warnings,
        "legend_size": len(result.role_legend),
        "sample": [i.model_dump(mode="json") for i in result.items[:5]],
    }


@app.get("/api/py/demo/wbs")
def demo_wbs() -> Response:
    """Download the fictional sample WBS."""
    return Response(
        build_demo_wbs(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="contoh_wbs.xlsx"'},
    )


@app.post("/api/py/runs")
async def create_run(
    settings: Annotated[str, Form()],
    wbs: Annotated[UploadFile | None, File()] = None,
    request_doc: Annotated[UploadFile | None, File()] = None,
    supporting_doc: Annotated[UploadFile | None, File()] = None,
    x_llm_api_key: Annotated[str | None, Header()] = None,
) -> StreamingResponse:
    """Run the agents and stream progress as newline-delimited JSON.

    The last line is ``{"type": "result", "run": ...}`` or
    ``{"type": "error", "message": ...}``.
    """
    try:
        options = RunSettings.model_validate(json.loads(settings))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=f"Pengaturan tidak valid: {exc}") from exc
    llm = _client(options.provider, x_llm_api_key, options.demo)
    catalog = options.catalog or load_default_catalog()

    if options.demo and wbs is None:
        wbs_bytes = build_demo_wbs()
        request_text, supporting_text = REQUEST_TEXT, NOTES_TEXT
        options.project.name = options.project.name or PROJECT_NAME
    else:
        wbs_bytes = await _read(wbs)
        if not wbs_bytes:
            raise HTTPException(status_code=400, detail="File WBS wajib diunggah.")
        request_text = (
            extract_text(request_doc.filename or "", await _read(request_doc) or b"")
            if request_doc
            else ""
        )
        supporting_text = (
            extract_text(supporting_doc.filename or "", await _read(supporting_doc) or b"")
            if supporting_doc
            else ""
        )
    try:
        parsed = read_wbs(wbs_bytes, holidays=options.parameters.holidays)
    except WbsFormatError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    inputs = RunInputs(
        project=options.project,
        parameters=options.parameters,
        items=parsed.items,
        legend=parsed.role_legend,
        request_text=request_text,
        supporting_text=supporting_text,
        role_inputs=options.role_inputs,
        ai_enabled=options.ai_enabled,
        ai_tools=options.ai_tools,
        catalog=catalog,
    )

    async def stream() -> Any:
        yield (
            json.dumps(
                {
                    "type": "progress",
                    "agent": "Orchestrator",
                    "status": "done",
                    "message": f"{len(parsed.items)} item WBS diterima",
                }
            )
            + "\n"
        )
        try:
            async for event in run_pipeline(inputs, llm):
                yield json.dumps(event, default=str) + "\n"
        except LLMError as exc:
            yield json.dumps({"type": "error", "message": str(exc)}) + "\n"
        except Exception as exc:  # report, never leak the key
            yield (
                json.dumps({"type": "error", "message": f"Run gagal: {type(exc).__name__}: {exc}"})
                + "\n"
            )

    return StreamingResponse(stream(), media_type="application/x-ndjson")


@app.post("/api/py/recalculate")
def recalc(body: RunEnvelope) -> dict[str, Any]:
    """Recalculate every number after a human edit. No model is called."""
    return recalculate(body.run).model_dump(mode="json")


@app.post("/api/py/reclassify")
async def reclassify(
    body: ReclassifyBody,
    x_llm_api_key: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Ask the Estimator to judge the chosen rows again with the reviewer's comment."""
    llm = _client(body.provider, x_llm_api_key, body.demo)
    try:
        run = await reclassify_rows(
            body.run, body.requests, body.catalog or load_default_catalog(), llm
        )
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return run.model_dump(mode="json")


@app.post("/api/py/excel")
def excel(body: RunEnvelope) -> Response:
    """Build the validation workbook from the run held by the browser."""
    run = recalculate(body.run)
    content = build_workbook(run, body.catalog or load_default_catalog())
    name = "".join(c if c.isalnum() else "_" for c in (run.project.name or "proyek"))[:50]
    return Response(
        content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="Validasi_Talent_{name}.xlsx"'},
    )


@app.exception_handler(ValidationError)
async def validation_error(_: Any, exc: ValidationError) -> JSONResponse:
    """Return model validation errors as 422 responses."""
    return JSONResponse(status_code=422, content={"detail": str(exc)})
