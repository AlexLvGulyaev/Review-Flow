"""Shared test configuration.

The review-flow backend tests are unit-style (no Postgres, no live services).
This conftest keeps the two new auth mechanisms disabled by default so legacy
tests that rely on the X-Role header fallback keep passing. Tests that exercise
the demo limiter or ops token RBAC re-enable what they need via ``monkeypatch``,
which restores the default automatically after the test.
"""

import pytest

from app.core.config import settings

# Defaults that must hold between tests: demo limiter off, no ops tokens.
_AUTH_DEFAULTS = {
    "demo_limiter_enabled": False,
    "ops_admin_token": "",
    "ops_operator_token": "",
    "ops_demo_token": "",
}


@pytest.fixture(autouse=True)
def _reset_auth_settings():
    """Reset auth-related settings before and after every test."""
    for key, value in _AUTH_DEFAULTS.items():
        setattr(settings, key, value)
    yield
    for key, value in _AUTH_DEFAULTS.items():
        setattr(settings, key, value)