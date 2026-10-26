"""Provider-agnostic access to chat models with structured output.

Skills ask for a Pydantic object and never deal with provider formats. The API
key is passed per request, kept in memory for the duration of the request, and
never logged or stored.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any, Literal, Protocol, TypeVar

from pydantic import BaseModel, Field, ValidationError

from talent_estimation.llm.privacy import mask_text

T = TypeVar("T", bound=BaseModel)

Provider = Literal["anthropic", "google", "openai", "azure", "openai_compatible"]
StructuredMethod = Literal["auto", "native", "function_calling", "json_mode", "prompt"]

_OPENAI_LIKE = ("openai", "azure", "openai_compatible")


class ProviderConfig(BaseModel):
    """Model selection supplied by the user. The API key is kept separately.

    Attributes
    ----------
    provider : str
        One of ``anthropic``, ``google``, ``openai``, ``azure``, or
        ``openai_compatible``.
    model : str
        Model name, or the deployment name for Azure OpenAI.
    base_url : str or None
        Endpoint URL for Azure OpenAI and OpenAI-compatible servers.
    api_version : str or None
        API version for Azure OpenAI.
    temperature : float
        Sampling temperature. Zero keeps judgements repeatable.
    mask_pii : bool
        Replace e-mail addresses, phone numbers, and national ID numbers in
        prompts with placeholders.
    send_temperature : bool
        Send ``temperature``. Some reasoning models accept only their default
        and reject the parameter, so the client turns it off when refused.
    max_tokens : int or None
        Output limit sent to OpenAI-compatible endpoints. Gateways that route
        to Claude need it; ``None`` leaves it out.
    extra_headers : dict
        Extra HTTP headers for OpenAI-compatible endpoints, for gateways that
        ask for a specific ``User-Agent`` or routing header.
    structured_method : str
        How a structured answer is requested. ``auto`` tries the provider's
        best method first and falls back when the endpoint refuses it:
        function calling, then JSON mode, then a JSON instruction in the prompt.
    """

    provider: Provider = "google"
    model: str = "gemini-3.8-flash"
    base_url: str | None = None
    api_version: str | None = None
    temperature: float = Field(0.0, ge=0, le=1)
    mask_pii: bool = True
    send_temperature: bool = True
    max_tokens: int | None = Field(8192, ge=256, le=64000)
    extra_headers: dict[str, str] = Field(default_factory=dict)
    structured_method: StructuredMethod = "auto"


class LLMError(RuntimeError):
    """Raised when a model call fails after retries."""


class LLMClient(Protocol):
    """Interface used by every LLM skill."""

    async def structured(self, schema: type[T], system: str, user: str, *, skill: str) -> T:
        """Return an instance of ``schema`` answering the prompt."""
        ...


def build_chat_model(config: ProviderConfig, api_key: str, *, send_temperature: bool | None = None):
    """Create a LangChain chat model for the chosen provider.

    Parameters
    ----------
    config : ProviderConfig
        Provider and model selection.
    api_key : str
        Key supplied by the user for this request.
    send_temperature : bool, optional
        Overrides ``config.send_temperature``.

    Returns
    -------
    langchain_core.language_models.BaseChatModel
        A configured chat model.
    """
    common: dict[str, Any] = {"timeout": 120, "max_retries": 2}
    use_temperature = config.send_temperature if send_temperature is None else send_temperature
    if use_temperature:
        common["temperature"] = config.temperature
    if config.provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=config.model, api_key=api_key, max_tokens=8192, **common)
    if config.provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(model=config.model, google_api_key=api_key, **common)
    if config.provider == "azure":
        from langchain_openai import AzureChatOpenAI

        if not config.base_url:
            raise ValueError("Azure OpenAI membutuhkan endpoint resource.")
        return AzureChatOpenAI(
            azure_endpoint=config.base_url,
            azure_deployment=config.model,
            api_version=config.api_version or "2024-10-21",
            api_key=api_key,
            **common,
        )
    from langchain_openai import ChatOpenAI

    if config.provider == "openai_compatible" and not config.base_url:
        raise ValueError("Endpoint kustom membutuhkan base URL.")
    extra: dict[str, Any] = {}
    if config.provider == "openai_compatible":
        if config.max_tokens:
            extra["max_tokens"] = config.max_tokens
        if config.extra_headers:
            extra["default_headers"] = dict(config.extra_headers)
    return ChatOpenAI(
        model=config.model, api_key=api_key, base_url=config.base_url, **common, **extra
    )


def _is_bad_request(exc: Exception) -> bool:
    """Return True when the endpoint rejected the request itself (HTTP 400 or 422)."""
    status = getattr(exc, "status_code", None) or getattr(
        getattr(exc, "response", None), "status_code", None
    )
    if status in (400, 422):
        return True
    text = str(exc)
    return bool(re.search(r"\b(400|422)\b", text)) and "Unauthorized" not in text


def _mentions_temperature(exc: Exception) -> bool:
    return "temperature" in str(exc).lower()


def _parse_json(text: str) -> Any:
    """Read a JSON object from a model reply, tolerating code fences and prose."""
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def explain_error(exc: Exception) -> str:
    """Turn a provider error into advice the user can act on."""
    text = str(exc)
    status = getattr(exc, "status_code", None)
    if status == 401 or "401" in text or "invalid api key" in text.lower():
        return "API key ditolak (401). Periksa key dan pastikan cocok dengan penyedia yang dipilih."
    if status == 404 or re.search(r"\b404\b", text):
        return "Model atau endpoint tidak ditemukan (404). Periksa nama model, nama deployment, dan base URL."
    if status == 429 or re.search(r"\b429\b", text):
        return "Kuota atau batas permintaan tercapai (429). Tunggu sebentar atau pakai model yang lebih ringan."
    if _is_bad_request(exc):
        return (
            "Endpoint menolak permintaan (400). Penyebab umum: nama model tidak dikenal oleh "
            "endpoint atau gateway, model tidak mendukung tool atau JSON, atau versi API tidak cocok. "
            "Coba nama model persis seperti di daftar gateway."
        )
    return "Panggilan model gagal."


class LangChainClient:
    """LLM client backed by a LangChain chat model.

    The client adapts to endpoints that refuse part of a request. When a call
    is rejected with HTTP 400 it first drops ``temperature``, then steps down
    the structured-output method. What worked is kept for later calls and
    listed in ``adjustments``.

    Parameters
    ----------
    config : ProviderConfig
        Provider and model selection.
    api_key : str
        Key supplied by the user for this request.
    max_concurrency : int, optional
        Maximum number of parallel model calls.
    """

    def __init__(self, config: ProviderConfig, api_key: str, max_concurrency: int = 4) -> None:
        self.config = config
        self._api_key = api_key
        self._send_temperature = config.send_temperature
        self._model = build_chat_model(config, api_key)
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._lock = asyncio.Lock()
        if config.structured_method != "auto":
            self._methods: list[str] = [config.structured_method]
        elif config.provider in _OPENAI_LIKE:
            self._methods = ["function_calling", "json_mode", "prompt"]
        else:
            self._methods = ["native", "prompt"]
        self.adjustments: list[str] = []
        self.calls = 0

    @property
    def method(self) -> str:
        """Structured-output method currently in use."""
        return self._methods[0]

    @property
    def send_temperature(self) -> bool:
        """Whether ``temperature`` is still sent."""
        return self._send_temperature

    async def _invoke(self, schema: type[T], messages: list[Any]) -> Any:
        method = self.method
        if method == "prompt":
            from langchain_core.messages import HumanMessage

            instruction = (
                "\n\nJawab HANYA dengan satu objek JSON yang valid terhadap JSON Schema berikut, "
                "tanpa teks lain:\n" + json.dumps(schema.model_json_schema(), ensure_ascii=False)
            )
            last = messages[-1]
            reply = await self._model.ainvoke(
                [*messages[:-1], HumanMessage(content=str(last.content) + instruction)]
            )
            return _parse_json(str(reply.content))
        if method == "native":
            return await self._model.with_structured_output(schema).ainvoke(messages)
        return await self._model.with_structured_output(schema, method=method).ainvoke(messages)

    async def _adapt(self, exc: Exception) -> bool:
        """Change one setting after a refused request. Returns False when out of options."""
        async with self._lock:
            # Temperature is the most common refusal, so it is dropped first:
            # on the first refusal, or whenever the error names it.
            if "max_tokens" in str(exc) and self.config.max_tokens:
                self.config = self.config.model_copy(update={"max_tokens": None})
                self._model = build_chat_model(
                    self.config, self._api_key, send_temperature=self._send_temperature
                )
                self.adjustments.append("max_tokens tidak dikirim")
                return True
            if self._send_temperature and (_mentions_temperature(exc) or not self.adjustments):
                self._send_temperature = False
                self._model = build_chat_model(self.config, self._api_key, send_temperature=False)
                self.adjustments.append("temperature tidak dikirim (memakai nilai bawaan model)")
                return True
            if len(self._methods) > 1:
                dropped = self._methods.pop(0)
                self.adjustments.append(
                    f"jawaban terstruktur memakai {self.method}, bukan {dropped}"
                )
                return True
            return False

    async def structured(self, schema: type[T], system: str, user: str, *, skill: str) -> T:
        """Call the model and parse its answer into ``schema``.

        Invalid answers are retried twice with the validation error appended
        to the prompt. Requests refused with HTTP 400 are retried with a
        simpler request, see the class notes.

        Raises
        ------
        LLMError
            If the model does not return a valid object.
        """
        from langchain_core.messages import HumanMessage, SystemMessage

        if self.config.mask_pii:
            user = mask_text(user)
        feedback = ""
        last_error: Exception | None = None
        attempts = 0
        while attempts < 3:
            async with self._semaphore:
                self.calls += 1
                try:
                    result = await self._invoke(
                        schema,
                        [SystemMessage(content=system), HumanMessage(content=user + feedback)],
                    )
                except (ValidationError, json.JSONDecodeError) as exc:
                    attempts += 1
                    last_error = exc
                    feedback = (
                        "\n\nJawaban sebelumnya tidak sesuai skema. Perbaiki kesalahan berikut:\n"
                        f"{exc}"
                    )
                    continue
                except Exception as exc:
                    if _is_bad_request(exc) and await self._adapt(exc):
                        continue
                    raise LLMError(
                        f"{explain_error(exc)} Skill: {skill}. Pesan dari server: {exc}"
                    ) from exc
            attempts += 1
            if isinstance(result, schema):
                return result
            if isinstance(result, dict):
                try:
                    return schema.model_validate(result)
                except ValidationError as exc:
                    last_error = exc
                    feedback = f"\n\nPerbaiki kesalahan skema berikut:\n{exc}"
                    continue
            last_error = ValueError("Model tidak mengembalikan jawaban terstruktur.")
        raise LLMError(f"Skill {skill} gagal mendapat jawaban valid: {last_error}")


async def test_connection(config: ProviderConfig, api_key: str) -> dict[str, Any]:
    """Send a minimal structured prompt to check the key, the endpoint, and the model.

    Returns
    -------
    dict
        ``reply`` from the model, the ``structured_method`` and
        ``send_temperature`` that worked, and the ``adjustments`` made.
    """

    class Ping(BaseModel):
        reply: str

    client = LangChainClient(config, api_key, max_concurrency=1)
    result = await client.structured(
        Ping, "Jawab singkat.", "Balas dengan kata OK pada field reply.", skill="ping"
    )
    return {
        "reply": result.reply,
        "max_tokens": client.config.max_tokens,
        "structured_method": client.method,
        "send_temperature": client.send_temperature,
        "adjustments": client.adjustments,
    }
