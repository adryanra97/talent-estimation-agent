"""The client adapts to endpoints that refuse temperature or tool calls."""

import pytest
from pydantic import BaseModel

from talent_estimation.llm import client as llm_client
from talent_estimation.llm.client import LangChainClient, LLMError, ProviderConfig


class Ping(BaseModel):
    reply: str


class BadRequestError(Exception):
    status_code = 400


class FakeReply:
    def __init__(self, content: str) -> None:
        self.content = content


class FakeModel:
    """Mimics a gateway that rejects temperature and function calling."""

    def __init__(self, send_temperature: bool, refuse: set[str]) -> None:
        self.send_temperature = send_temperature
        self.refuse = refuse

    def _check(self, method: str) -> None:
        if self.send_temperature and "temperature" in self.refuse:
            raise BadRequestError("Error code: 400 - Upstream provider returned HTTP 400.")
        if method in self.refuse:
            raise BadRequestError(f"Error code: 400 - {method} not supported")

    def with_structured_output(self, schema, method: str = "native"):
        model = self

        class Runnable:
            async def ainvoke(self, messages):
                model._check(method)
                return schema(reply="OK")

        return Runnable()

    async def ainvoke(self, messages):
        self._check("prompt")
        return FakeReply('```json\n{"reply": "OK"}\n```')


def patch(monkeypatch, refuse: set[str]) -> None:
    def build(config, api_key, *, send_temperature=None):
        use = config.send_temperature if send_temperature is None else send_temperature
        return FakeModel(use, refuse)

    monkeypatch.setattr(llm_client, "build_chat_model", build)


async def test_drops_temperature_then_tool_calls(monkeypatch):
    patch(monkeypatch, {"temperature", "function_calling", "json_mode"})
    config = ProviderConfig(provider="openai_compatible", model="m", base_url="https://x")
    result = await llm_client.test_connection(config, "key")
    assert result["reply"] == "OK"
    assert result["send_temperature"] is False
    assert result["structured_method"] == "prompt"
    assert len(result["adjustments"]) == 3


async def test_settings_from_test_are_reused(monkeypatch):
    patch(monkeypatch, {"temperature", "function_calling"})
    config = ProviderConfig(
        provider="openai_compatible",
        model="m",
        base_url="https://x",
        send_temperature=False,
        structured_method="json_mode",
    )
    client = LangChainClient(config, "key")
    answer = await client.structured(Ping, "s", "u", skill="t")
    assert answer.reply == "OK" and client.adjustments == []


async def test_gives_advice_when_everything_is_refused(monkeypatch):
    patch(monkeypatch, {"temperature", "function_calling", "json_mode", "prompt"})
    config = ProviderConfig(provider="openai_compatible", model="m", base_url="https://x")
    with pytest.raises(LLMError, match="nama model"):
        await llm_client.test_connection(config, "key")
