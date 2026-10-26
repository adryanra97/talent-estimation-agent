"""Mask personal data in text before it is sent to a model."""

from __future__ import annotations

import re

_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[EMAIL]"),
    (re.compile(r"\b\d{16}\b"), "[NIK]"),
    (re.compile(r"(?:\+62|62|0)8\d{2}[\s.-]?\d{3,4}[\s.-]?\d{3,5}"), "[TELEPON]"),
)


def mask_text(text: str) -> str:
    """Replace e-mail addresses, 16-digit ID numbers, and phone numbers.

    Parameters
    ----------
    text : str
        Text that may contain personal data.

    Returns
    -------
    str
        Text with personal data replaced by placeholders.

    Examples
    --------
    >>> mask_text("Hubungi budi@contoh.id atau 0812-3456-7890")
    'Hubungi [EMAIL] atau [TELEPON]'
    """
    for pattern, placeholder in _PATTERNS:
        text = pattern.sub(placeholder, text)
    return text
