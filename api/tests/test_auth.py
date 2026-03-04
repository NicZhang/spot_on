"""Unit tests for auth endpoint helper functions and request schemas."""

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.api.v1.endpoints.auth import (
    PhoneBindRequest,
    PhoneLoginRequest,
    RefreshTokenRequest,
    SendCodeRequest,
    WechatLoginRequest,
    _build_login_response,
)


class TestWechatLoginRequest:
    def test_valid_minimal(self) -> None:
        req = WechatLoginRequest(code="abc123")
        assert req.code == "abc123"
        assert req.encrypted_data is None
        assert req.iv is None

    def test_valid_full(self) -> None:
        req = WechatLoginRequest(code="abc123", encrypted_data="enc", iv="iv_val")
        assert req.encrypted_data == "enc"

    def test_missing_code(self) -> None:
        with pytest.raises(ValidationError):
            WechatLoginRequest()  # type: ignore[call-arg]


class TestPhoneLoginRequest:
    def test_valid(self) -> None:
        req = PhoneLoginRequest(phone="13800138000", code="123456")
        assert req.phone == "13800138000"

    def test_missing_code(self) -> None:
        with pytest.raises(ValidationError):
            PhoneLoginRequest(phone="13800138000")  # type: ignore[call-arg]


class TestSendCodeRequest:
    def test_valid(self) -> None:
        req = SendCodeRequest(phone="13800138000")
        assert req.phone == "13800138000"


class TestPhoneBindRequest:
    def test_valid(self) -> None:
        req = PhoneBindRequest(phone="13800138000", code="654321")
        assert req.code == "654321"


class TestRefreshTokenRequest:
    def test_valid(self) -> None:
        req = RefreshTokenRequest(refresh_token="some.jwt.token")
        assert req.refresh_token == "some.jwt.token"


class TestBuildLoginResponse:
    def test_structure(self) -> None:
        """Verify the login response contains the expected envelope."""
        # Create a minimal mock user-like object that has model_dump()
        class FakeUser:
            def model_dump(self) -> dict:
                return {
                    "id": uuid.uuid4(),
                    "open_id": "test_openid",
                    "name": "Test",
                    "role": "PLAYER",
                }

        resp = _build_login_response("access_tok", "refresh_tok", FakeUser())  # type: ignore[arg-type]
        assert resp["success"] is True
        data = resp["data"]
        assert data["token"] == "access_tok"
        assert data["refreshToken"] == "refresh_tok"
        assert data["expiresIn"] == 604800
        assert "user" in data
        assert data["user"]["openId"] == "test_openid"
