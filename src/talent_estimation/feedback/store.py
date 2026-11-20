"""Where feedback lives: Upstash Redis in production, memory otherwise."""

from __future__ import annotations

import json
import os
from typing import Protocol

import httpx

from talent_estimation.feedback.models import Feedback

KEY = "talentlens:feedback"
MAX_ITEMS = 300


class FeedbackStore(Protocol):
    """Minimal persistence used by the API."""

    backend: str

    def list(self) -> list[Feedback]:
        """Return all items, newest first."""
        ...

    def get(self, feedback_id: str) -> Feedback | None:
        """Return one item, or ``None`` when it does not exist."""
        ...

    def save(self, item: Feedback) -> None:
        """Insert or replace an item."""
        ...


class MemoryStore:
    """Keeps feedback in the process. Lost on restart; fine for local runs and tests."""

    backend = "memory"

    def __init__(self) -> None:
        self._items: dict[str, Feedback] = {}

    def list(self) -> list[Feedback]:
        """Return all items, newest first."""
        return sorted(self._items.values(), key=lambda f: f.created_at, reverse=True)

    def get(self, feedback_id: str) -> Feedback | None:
        """Return one item, or ``None``."""
        return self._items.get(feedback_id)

    def save(self, item: Feedback) -> None:
        """Insert or replace an item, dropping the oldest past the limit."""
        self._items[item.id] = item
        if len(self._items) > MAX_ITEMS:
            oldest = sorted(self._items.values(), key=lambda f: f.created_at)[0]
            self._items.pop(oldest.id, None)


class RedisStore:
    """Upstash Redis over its REST API, one hash field per feedback item."""

    backend = "redis"

    def __init__(self, url: str, token: str) -> None:
        self._url = url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {token}"}

    def _call(self, *command: str) -> object:
        res = httpx.post(self._url, headers=self._headers, json=list(command), timeout=10)
        res.raise_for_status()
        body = res.json()
        if "error" in body:
            raise RuntimeError(body["error"])
        return body.get("result")

    def list(self) -> list[Feedback]:
        """Return all items, newest first."""
        raw = self._call("HVALS", KEY)
        values = raw if isinstance(raw, list) else []
        items = [Feedback.model_validate(json.loads(v)) for v in values]
        return sorted(items, key=lambda f: f.created_at, reverse=True)

    def get(self, feedback_id: str) -> Feedback | None:
        """Return one item, or ``None``."""
        raw = self._call("HGET", KEY, feedback_id)
        return Feedback.model_validate(json.loads(raw)) if isinstance(raw, str) else None

    def save(self, item: Feedback) -> None:
        """Insert or replace an item, dropping the oldest past the limit."""
        self._call("HSET", KEY, item.id, item.model_dump_json())
        count = self._call("HLEN", KEY)
        if isinstance(count, int) and count > MAX_ITEMS:
            oldest = self.list()[-1]
            self._call("HDEL", KEY, oldest.id)


_memory = MemoryStore()


def get_store() -> FeedbackStore:
    """Return the Redis store when Upstash variables are set, else the memory store.

    Both the Vercel Marketplace names (``KV_REST_API_*``) and Upstash's own
    names (``UPSTASH_REDIS_REST_*``) are accepted.
    """
    url = os.environ.get("KV_REST_API_URL") or os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if url and token:
        return RedisStore(url, token)
    return _memory
