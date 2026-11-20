"""Monthly pay benchmarks per role and level, used to put a price on FTE."""

from __future__ import annotations

from importlib import resources
from typing import Literal

import yaml
from pydantic import BaseModel, Field, field_validator, model_validator

LEVELS = ("J", "M", "S", "L")


class Source(BaseModel):
    """A public page a benchmark comes from."""

    name: str
    url: str
    date: str


class RoleRate(BaseModel):
    """Monthly pay range per level for one role, in million rupiah."""

    basis: str = ""
    J: tuple[float, float]
    M: tuple[float, float]
    S: tuple[float, float]
    L: tuple[float, float]

    @model_validator(mode="after")
    def _check_ranges(self) -> RoleRate:
        for level in LEVELS:
            low, high = getattr(self, level)
            if low < 0 or high < 0:
                raise ValueError(f"Rate level {level} tidak boleh negatif.")
            if low > high:
                raise ValueError(f"Rate minimum level {level} lebih besar dari maksimum.")
        return self

    def median(self, level: str) -> float:
        """Midpoint of the range for a level."""
        low, high = getattr(self, level)
        return (low + high) / 2


class RateTable(BaseModel):
    """Pay benchmarks plus the two multipliers that turn pay into cost."""

    version: str
    currency: str = "IDR"
    unit_label: str
    levels: dict[str, str]
    employer_multiplier: float = Field(gt=0)
    employer_note: str = ""
    vendor_multiplier: float = Field(gt=0)
    vendor_note: str = ""
    method: str = ""
    roles: dict[str, RoleRate]
    sources: list[Source] = []

    @field_validator("levels")
    @classmethod
    def _known_levels(cls, value: dict[str, str]) -> dict[str, str]:
        if set(value) != set(LEVELS):
            raise ValueError("Level rate harus J, M, S, dan L.")
        return value


class CostSettings(BaseModel):
    """How a run's FTE is priced: which rates, level per role, basis and method."""

    rates: RateTable
    levels: dict[str, str] = {}
    basis: Literal["employee", "vendor"] = "employee"
    method: Literal["ucp", "bu"] = "bu"

    def level(self, role: str) -> str:
        """Level code used for a role, Middle when none was chosen."""
        value = self.levels.get(role, "M")
        return value if value in LEVELS else "M"

    @property
    def multiplier(self) -> float:
        """Multiplier that turns gross pay into cost for the chosen basis."""
        if self.basis == "vendor":
            return self.rates.vendor_multiplier
        return self.rates.employer_multiplier


def load_default_rates() -> RateTable:
    """Load the rate table that ships with the package.

    Returns
    -------
    RateTable
        The default benchmarks.
    """
    text = (
        resources.files("talent_estimation.rates")
        .joinpath("default_rates.yaml")
        .read_text(encoding="utf-8")
    )
    return RateTable.model_validate(yaml.safe_load(text))


__all__ = ["LEVELS", "CostSettings", "RateTable", "RoleRate", "Source", "load_default_rates"]
