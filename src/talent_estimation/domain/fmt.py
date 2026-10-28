"""Number formatting for text shown to people, in Indonesian style.

Numbers in messages and findings use a decimal comma, like the interface and
the Excel workbook, so a reader never sees "1.87" in one place and "1,87" in
another.
"""

from __future__ import annotations


def num(value: float, digits: int = 2) -> str:
    """Format a number with a decimal comma and dot thousands separators.

    Examples
    --------
    >>> num(1234.5)
    '1.234,50'
    >>> num(0.5, 1)
    '0,5'
    """
    text = f"{value:,.{digits}f}"
    return text.replace(",", "\0").replace(".", ",").replace("\0", ".")


def short(value: float) -> str:
    """Format a number without trailing zeros, for example 0,5 or 1."""
    text = f"{value:g}"
    return text.replace(".", ",")


def pct(value: float, signed: bool = False) -> str:
    """Format a fraction as a whole percentage, for example +54%."""
    text = f"{value * 100:+.0f}%" if signed else f"{value * 100:.0f}%"
    return text


_MONTHS = ("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des")


def day(value: object) -> str:
    """Format a date as '1 Feb 2027' with Indonesian month names; '-' when empty."""
    if value is None:
        return "-"
    return f"{value.day} {_MONTHS[value.month - 1]} {value.year}"  # type: ignore[attr-defined]
