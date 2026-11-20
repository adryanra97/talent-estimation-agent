import pytest
from api.index import app
from fastapi.testclient import TestClient
from pydantic import ValidationError

from talent_estimation.catalog import load_default_catalog
from talent_estimation.rates import RoleRate, load_default_rates


def test_default_rates_cover_catalog_roles():
    rates = load_default_rates()
    assert set(rates.roles) == set(load_default_catalog().roles)
    assert rates.employer_multiplier > 1 and rates.vendor_multiplier > 1
    assert all(s.url.startswith("https://") for s in rates.sources)
    for role in rates.roles.values():
        medians = [role.median(level) for level in ("J", "M", "S", "L")]
        assert medians == sorted(medians)


def test_role_rate_rejects_bad_ranges():
    with pytest.raises(ValidationError):
        RoleRate(J=(10, 5), M=(1, 2), S=(2, 3), L=(3, 4))
    with pytest.raises(ValidationError):
        RoleRate(J=(-1, 5), M=(1, 2), S=(2, 3), L=(3, 4))


def test_rates_endpoint():
    body = TestClient(app).get("/api/py/rates").json()
    assert body["roles"]["DE"]["M"] == [13.5, 26.0]
    assert body["levels"]["L"] == "Lead"
