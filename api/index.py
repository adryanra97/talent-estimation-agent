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
from talent_estimation.catalog import (
    Catalog,
    catalog_to_excel,
    load_catalog_file,
    load_default_catalog,
)
from talent_estimation.demo import NOTES_TEXT, PROJECT_NAME, REQUEST_TEXT, build_demo_wbs
from talent_estimation.domain.models import (
    Parameters,
    ProjectInfo,
    RoleInput,
    RunResult,
)
from talent_estimation.excel import build_workbook
from talent_estimation.io import WbsFormatError, WbsReadResult, extract_text, merge_wbs, read_wbs
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
"""Total upload size per request. Vercel functions accept about 4.5 MB."""
MAX_FILES_PER_FIELD = 5

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


async def _read_all(uploads: list[UploadFile] | None, label: str) -> list[tuple[str, bytes]]:
    """Read every uploaded file of one form field."""
    chosen = [u for u in uploads or [] if u.filename]
    if len(chosen) > MAX_FILES_PER_FIELD:
        raise HTTPException(
            status_code=400,
            detail=f"{label} paling banyak {MAX_FILES_PER_FIELD} file.",
        )
    return [(u.filename or "", await _read(u) or b"") for u in chosen]


def _check_total(*groups: list[tuple[str, bytes]]) -> None:
    total = sum(len(content) for group in groups for _, content in group)
    if total > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Total ukuran file lebih dari 4 MB. Kurangi atau kecilkan file.",
        )


def _documents_text(files: list[tuple[str, bytes]]) -> str:
    """Join the text of several documents, each under its own heading."""
    parts = []
    for name, content in files:
        text = extract_text(name, content).strip()
        if text:
            parts.append(f"=== Dokumen: {name} ===\n{text}" if len(files) > 1 else text)
    return "\n\n".join(parts)


def _read_wbs_files(
    files: list[tuple[str, bytes]], holidays: list[Any] | None = None
) -> tuple[list[tuple[str, WbsReadResult]], WbsReadResult]:
    """Read each WBS workbook and merge them. Errors name the file."""
    results = []
    for name, content in files:
        try:
            results.append((name, read_wbs(content, holidays=holidays)))
        except WbsFormatError as exc:
            message = f"{name}: {exc}" if len(files) > 1 else str(exc)
            raise HTTPException(status_code=422, detail=message) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=422, detail=f"File {name} tidak bisa dibaca: {exc}"
            ) from exc
    return results, merge_wbs(results)


def _period(result: WbsReadResult) -> tuple[str | None, str | None]:
    starts = [i.start for i in result.items if i.start]
    ends = [i.end for i in result.items if i.end]
    return (
        min(starts).isoformat() if starts else None,
        max(ends).isoformat() if ends else None,
    )


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


class CatalogBody(BaseModel):
    """A catalog sent by the browser; the default catalog is used when empty."""

    catalog: Catalog | None = None


@app.post("/api/py/catalog/excel")
def catalog_excel(body: CatalogBody) -> Response:
    """Download a catalog as an editable Excel workbook."""
    content = catalog_to_excel(body.catalog or load_default_catalog())
    return Response(
        content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="Katalog_Capability.xlsx"'},
    )


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
async def wbs_preview(file: Annotated[list[UploadFile], File()]) -> dict[str, Any]:
    """Read one or more WBS files and report what was recognised, before a run starts."""
    files = await _read_all(file, "WBS")
    _check_total(files)
    results, merged = _read_wbs_files(files)
    start, end = _period(merged)
    return {
        "sheet": merged.mapping.sheet,
        "items": len(merged.items),
        "rows": merged.total_rows,
        "start": start,
        "end": end,
        "warnings": merged.warnings,
        "legend_size": len(merged.role_legend),
        "files": [
            {
                "name": name,
                "sheet": result.mapping.sheet,
                "items": len(result.items),
                "start": _period(result)[0],
                "end": _period(result)[1],
            }
            for name, result in results
        ],
        "sample": [i.model_dump(mode="json") for i in merged.items[:5]],
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
    wbs: Annotated[list[UploadFile] | None, File()] = None,
    request_doc: Annotated[list[UploadFile] | None, File()] = None,
    supporting_doc: Annotated[list[UploadFile] | None, File()] = None,
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

    wbs_files = await _read_all(wbs, "WBS")
    request_files = await _read_all(request_doc, "Dokumen permintaan")
    supporting_files = await _read_all(supporting_doc, "Dokumen pendukung")
    _check_total(wbs_files, request_files, supporting_files)

    if options.demo and not wbs_files:
        wbs_files = [("WBS_contoh.xlsx", build_demo_wbs())]
        request_text, supporting_text = REQUEST_TEXT, NOTES_TEXT
        options.project = options.project.model_copy(
            update={
                "name": PROJECT_NAME,
                "start": None,
                "end": None,
                "reference": "",
                "scope": "all",
            }
        )
    else:
        if not wbs_files:
            raise HTTPException(status_code=400, detail="File WBS wajib diunggah.")
        request_text = _documents_text(request_files)
        supporting_text = _documents_text(supporting_files)
    _, parsed = _read_wbs_files(wbs_files, holidays=options.parameters.holidays)

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
                    "message": (
                        f"{len(parsed.items)} item WBS diterima dari {len(wbs_files)} file"
                        if len(wbs_files) > 1
                        else f"{len(parsed.items)} item WBS diterima"
                    ),
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
