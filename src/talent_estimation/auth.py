"""Demo accounts and signed session tokens.

Two fixed accounts are enough for a portfolio demo: a reviewer who sends
feedback and an admin who approves it. Passwords come from environment
variables; tokens are HMAC-signed so any server instance can check them
without a session store.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Literal

from pydantic import BaseModel

Role = Literal["reviewer", "admin"]
SESSION_SECONDS = 8 * 3600
_LOCAL_SECRET = secrets.token_hex(32)


class User(BaseModel):
    """A signed-in demo account."""

    username: str
    role: Role
    name: str


def on_vercel() -> bool:
    """Tell whether the code runs in a Vercel deployment."""
    return bool(os.environ.get("VERCEL"))


def reviewer_password() -> str:
    """Reviewer password. Public on purpose so visitors can try the flow."""
    return os.environ.get("DEMO_REVIEWER_PASSWORD", "reviewer-demo")


def admin_password() -> str | None:
    """Admin password, or ``None`` when the admin account is disabled.

    Locally the admin account works with ``admin-demo``. On Vercel it needs
    ``DEMO_ADMIN_PASSWORD`` so that visitors cannot approve feedback.
    """
    value = os.environ.get("DEMO_ADMIN_PASSWORD")
    if value:
        return value
    return None if on_vercel() else "admin-demo"


def _secret() -> bytes:
    value = os.environ.get("AUTH_SECRET")
    if value:
        return value.encode()
    admin = os.environ.get("DEMO_ADMIN_PASSWORD")
    if admin:
        return hashlib.sha256(f"talentlens:{admin}".encode()).digest()
    return _LOCAL_SECRET.encode()


def authenticate(username: str, password: str) -> User | None:
    """Return the account for valid credentials, otherwise ``None``."""
    username = username.strip().lower()
    if username == "reviewer" and hmac.compare_digest(password, reviewer_password()):
        return User(username="reviewer", role="reviewer", name="Reviewer demo")
    admin = admin_password()
    if username == "admin" and admin and hmac.compare_digest(password, admin):
        return User(username="admin", role="admin", name="Admin demo")
    return None


def issue_token(user: User, now: float | None = None) -> str:
    """Sign a session token for a user."""
    payload = {**user.model_dump(), "exp": int((now or time.time()) + SESSION_SECONDS)}
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(_secret(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def read_token(token: str | None, now: float | None = None) -> User | None:
    """Return the user in a valid, unexpired token, otherwise ``None``."""
    if not token or "." not in token:
        return None
    body, sig = token.rsplit(".", 1)
    expected = hmac.new(_secret(), body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
    except ValueError:
        return None
    if payload.get("exp", 0) < (now or time.time()):
        return None
    return User.model_validate(payload)
