"""Provider-agnostic access to chat models with structured output.

Skills ask for a Pydantic object and never deal with provider formats. The API
key is passed per request, kept in memory for the duration of the request, and
never logged or stored.
"""

from __future__ import annotations

import asyncio
from typing import Any, Literal, Protocol, TypeVar

from pydantic import BaseModel, Field, ValidationError

from talent_estimation.llm.privacy import mask_text

T = TypeVar("T", bound=BaseModel)

Provider = Literal["anthropic", "google", "openai", "azure", "openai_compatible"]


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
    """

    provider: Provider = "google"
    model: str = "gemini-3.8-flash"
    base_url: str | None = None
    api_version: str | None = None
    temperature: float = Field(0.0, ge=0, le=1)
    mask_pii: bool = True


class LLMError(RuntimeError):
    """Raised when a model call fails after retries."""


class LLMClient(Protocol):
    """Interface used by every LLM skill."""

    async def structured(self, schema: type[T], system: str, user: str, *, skill: str) -> T:
        """Return an instance of ``schema`` answering the prompt."""
        ...


def build_chat_model(config: ProviderConfig, api_key: str):
    """Create a LangChain chat model for the chosen provider.

    Parameters
    ----------
    config : ProviderConfig
        Provider and model selection.
    api_key : str
        Key supplied by the user for this request.

    Returns
    -------
    langchain_core.language_models.BaseChatModel
        A configured chat model.
    """
    common: dict[str, Any] = {"temperature": config.temperature, "timeout": 120, "max_retries": 2}
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
    return ChatOpenAI(model=config.model, api_key=api_key, base_url=config.base_url, **common)


class LangChainClient:
    """LLM client backed by a LangChain chat model.

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
        self._model = build_chat_model(config, api_key)
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self.calls = 0

    def _structured_model(self, schema: type[BaseModel]):
        if self.config.provider in ("openai", "azure", "openai_compatible"):
            return self._model.with_structured_output(schema, method="function_calling")
        return self._model.with_structured_output(schema)

    async def structured(self, schema: type[T], system: str, user: str, *, skill: str) -> T:
        """Call the model and parse its answer into ``schema``.

        Invalid answers are retried twice with the validation error appended
        to the prompt.

        Raises
        ------
        LLMError
            If the model does not return a valid object.
        """
        from langchain_core.messages import HumanMessage, SystemMessage

        if self.config.mask_pii:
            user = mask_text(user)
        runnable = self._structured_model(schema)
        feedback = ""
        last_error: Exception | None = None
        for _ in range(3):
            async with self._semaphore:
                self.calls += 1
                try:
                    result = await runnable.ainvoke(
                        [SystemMessage(content=system), HumanMessage(content=user + feedback)]
                    )
                except ValidationError as exc:
                    last_error = exc
                    feedback = (
                        "\n\nJawaban sebelumnya tidak sesuai skema. Perbaiki kesalahan berikut:\n"
                        f"{exc}"
                    )
                    continue
                except Exception as exc:
                    raise LLMError(f"Panggilan model gagal pada skill {skill}: {exc}") from exc
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


async def test_connection(config: ProviderConfig, api_key: str) -> str:
    """Send a minimal prompt to check the key and the endpoint.

    Returns
    -------
    str
        The model's reply.
    """

    class Ping(BaseModel):
        reply: str

    client = LangChainClient(config, api_key, max_concurrency=1)
    result = await client.structured(
        Ping, "Jawab singkat.", "Balas dengan kata OK pada field reply.", skill="ping"
    )
    return result.reply
