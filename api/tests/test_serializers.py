"""Unit tests for app.core.serializers."""

import uuid
from datetime import date, datetime, time
from decimal import Decimal

import pytest

from app.core.serializers import serialize, to_camel


# ---------------------------------------------------------------------------
# to_camel
# ---------------------------------------------------------------------------


class TestToCamel:
    def test_single_word(self) -> None:
        assert to_camel("name") == "name"

    def test_two_words(self) -> None:
        assert to_camel("created_at") == "createdAt"

    def test_three_words(self) -> None:
        assert to_camel("mvp_count") == "mvpCount"

    def test_four_words(self) -> None:
        assert to_camel("current_team_id") == "currentTeamId"

    def test_already_single(self) -> None:
        assert to_camel("id") == "id"


# ---------------------------------------------------------------------------
# serialize
# ---------------------------------------------------------------------------


class TestSerialize:
    def test_dict_input(self) -> None:
        data = {"first_name": "Alice", "last_name": "Bob"}
        result = serialize(data)
        assert result == {"firstName": "Alice", "lastName": "Bob"}

    def test_uuid_conversion(self) -> None:
        uid = uuid.uuid4()
        result = serialize({"user_id": uid})
        assert result["userId"] == str(uid)

    def test_datetime_conversion(self) -> None:
        dt = datetime(2025, 1, 15, 12, 30, 0)
        result = serialize({"created_at": dt})
        assert result["createdAt"] == dt.isoformat()

    def test_date_conversion(self) -> None:
        d = date(2025, 6, 1)
        result = serialize({"start_date": d})
        assert result["startDate"] == "2025-06-01"

    def test_time_conversion(self) -> None:
        t = time(14, 30)
        result = serialize({"kick_off": t})
        assert result["kickOff"] == "14:30"

    def test_decimal_conversion(self) -> None:
        result = serialize({"balance": Decimal("99.50")})
        assert result["balance"] == 99.5
        assert isinstance(result["balance"], float)

    def test_none_value_preserved(self) -> None:
        result = serialize({"phone": None})
        assert result["phone"] is None

    def test_int_value_preserved(self) -> None:
        result = serialize({"goals": 5})
        assert result["goals"] == 5

    def test_bool_value_preserved(self) -> None:
        result = serialize({"is_active": True})
        assert result["isActive"] is True

    def test_empty_dict(self) -> None:
        assert serialize({}) == {}
