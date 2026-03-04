"""Unit tests for users endpoint schemas and helpers."""

import pytest
from pydantic import ValidationError

from app.api.v1.endpoints.users import UserUpdateRequest, _build_user_response


class TestUserUpdateRequest:
    def test_all_none_by_default(self) -> None:
        req = UserUpdateRequest()
        assert req.name is None
        assert req.avatar is None
        assert req.gender is None

    def test_partial_update(self) -> None:
        req = UserUpdateRequest(name="New Name")
        data = req.model_dump(exclude_unset=True)
        assert data == {"name": "New Name"}
        assert "avatar" not in data
        assert "gender" not in data

    def test_full_update(self) -> None:
        req = UserUpdateRequest(name="Alice", avatar="https://img.example.com/a.png", gender="female")
        data = req.model_dump(exclude_unset=True)
        assert len(data) == 3

    def test_empty_body_yields_empty_dump(self) -> None:
        req = UserUpdateRequest()
        data = req.model_dump(exclude_unset=True)
        assert data == {}


class TestBuildUserResponse:
    def test_stats_object_created(self) -> None:
        user_data = {
            "id": "some-uuid",
            "name": "Player",
            "goals": 10,
            "assists": 5,
            "mvpCount": 3,
            "appearances": 20,
            "balance": 100.0,
        }
        result = _build_user_response(user_data)
        assert "stats" in result
        stats = result["stats"]
        assert stats["goals"] == 10
        assert stats["assists"] == 5
        assert stats["mvpCount"] == 3
        assert stats["appearances"] == 20
        assert stats["balance"] == 100.0

    def test_defaults_for_missing_fields(self) -> None:
        user_data = {"id": "some-uuid", "name": "New Player"}
        result = _build_user_response(user_data)
        stats = result["stats"]
        assert stats["goals"] == 0
        assert stats["assists"] == 0
        assert stats["mvpCount"] == 0
        assert stats["appearances"] == 0
        assert stats["balance"] == 0.0
