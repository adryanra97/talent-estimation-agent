from datetime import date

from talent_estimation.calc.calendar import (
    add_months,
    duration_months,
    end_of_month,
    month_starts,
    networkdays,
)


def test_networkdays_matches_excel():
    assert networkdays(date(2026, 10, 1), date(2026, 10, 31)) == 22
    assert networkdays(date(2026, 10, 3), date(2026, 10, 4)) == 0
    assert networkdays(date(2026, 10, 5), date(2026, 10, 1)) == -3


def test_networkdays_excludes_weekday_holidays_only():
    holidays = [date(2026, 10, 5), date(2026, 10, 4)]
    assert networkdays(date(2026, 10, 1), date(2026, 10, 9), holidays) == 6


def test_month_helpers():
    assert end_of_month(date(2028, 2, 10)) == date(2028, 2, 29)
    assert add_months(date(2026, 12, 15), 1) == date(2027, 1, 1)
    assert list(month_starts(date(2026, 11, 20), date(2027, 1, 2))) == [
        date(2026, 11, 1),
        date(2026, 12, 1),
        date(2027, 1, 1),
    ]
    assert duration_months(date(2026, 9, 1), date(2026, 12, 31)) == 4
