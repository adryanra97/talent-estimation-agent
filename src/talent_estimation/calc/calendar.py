"""Working-day arithmetic that mirrors Excel ``NETWORKDAYS`` and ``EOMONTH``."""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from datetime import date, timedelta


def networkdays(start: date, end: date, holidays: Iterable[date] = ()) -> int:
    """Count working days between two dates, inclusive.

    Parameters
    ----------
    start, end : date
        Period boundaries. When ``end`` is before ``start`` the result is
        negative, as in Excel.
    holidays : iterable of date, optional
        Dates excluded from the count.

    Returns
    -------
    int
        Number of Monday-to-Friday days that are not holidays.

    Examples
    --------
    >>> networkdays(date(2026, 10, 1), date(2026, 10, 31))
    22
    """
    if end < start:
        return -networkdays(end, start, holidays)
    skip = {d for d in holidays if start <= d <= end and d.weekday() < 5}
    total_days = (end - start).days + 1
    full_weeks, remainder = divmod(total_days, 7)
    count = full_weeks * 5
    for offset in range(remainder):
        if (start + timedelta(days=full_weeks * 7 + offset)).weekday() < 5:
            count += 1
    return count - len(skip)


def end_of_month(day: date) -> date:
    """Return the last day of the month of ``day`` (Excel ``EOMONTH(day, 0)``)."""
    first_next = date(day.year + day.month // 12, day.month % 12 + 1, 1)
    return first_next - timedelta(days=1)


def add_months(day: date, months: int) -> date:
    """Return the first day of the month ``months`` after the month of ``day``."""
    index = day.year * 12 + day.month - 1 + months
    return date(index // 12, index % 12 + 1, 1)


def month_starts(start: date, end: date, limit: int = 24) -> Iterator[date]:
    """Yield the first day of every month touched by a period.

    Parameters
    ----------
    start, end : date
        Period boundaries.
    limit : int, optional
        Maximum number of months to yield.

    Yields
    ------
    date
        First day of each month from the month of ``start`` to the month of ``end``.
    """
    current = date(start.year, start.month, 1)
    for _ in range(limit):
        if current > end:
            return
        yield current
        current = add_months(current, 1)


def duration_months(start: date, end: date) -> int:
    """Return the inclusive number of calendar months in a period.

    Examples
    --------
    >>> duration_months(date(2026, 9, 1), date(2026, 12, 31))
    4
    """
    return (end.year - start.year) * 12 + end.month - start.month + 1
