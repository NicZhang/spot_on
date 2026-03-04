"""Unit tests for app.services.wechat."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.wechat import code_to_session


def _make_mock_client(response_data: dict) -> MagicMock:
    """Create a mock httpx.AsyncClient that returns *response_data* from .json()."""
    mock_response = MagicMock()
    mock_response.json.return_value = response_data

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    return mock_client


@pytest.mark.asyncio
class TestCodeToSession:
    async def test_success(self) -> None:
        """Should return openid and session_key from a successful response."""
        data = {"openid": "test_openid_123", "session_key": "test_session_key"}
        mock_client = _make_mock_client(data)

        with patch("app.services.wechat.httpx.AsyncClient", return_value=mock_client):
            result = await code_to_session("valid_code")

        assert result["openid"] == "test_openid_123"
        assert result["session_key"] == "test_session_key"

    async def test_success_with_unionid(self) -> None:
        """Should include unionid when present in the WeChat response."""
        data = {
            "openid": "test_openid_123",
            "session_key": "test_session_key",
            "unionid": "test_unionid_456",
        }
        mock_client = _make_mock_client(data)

        with patch("app.services.wechat.httpx.AsyncClient", return_value=mock_client):
            result = await code_to_session("valid_code")

        assert result["unionid"] == "test_unionid_456"

    async def test_error_raises_value_error(self) -> None:
        """Should raise ValueError when errcode is non-zero."""
        data = {"errcode": 40029, "errmsg": "invalid code"}
        mock_client = _make_mock_client(data)

        with patch("app.services.wechat.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(ValueError, match="invalid code"):
                await code_to_session("bad_code")

    async def test_errcode_zero_is_success(self) -> None:
        """errcode == 0 should be treated as success (not an error)."""
        data = {"errcode": 0, "openid": "test_openid_999", "session_key": "sk"}
        mock_client = _make_mock_client(data)

        with patch("app.services.wechat.httpx.AsyncClient", return_value=mock_client):
            result = await code_to_session("ok_code")

        assert result["openid"] == "test_openid_999"

    async def test_error_without_errmsg_uses_default(self) -> None:
        """Should use default error message when errmsg is absent."""
        data = {"errcode": 99999}
        mock_client = _make_mock_client(data)

        with patch("app.services.wechat.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(ValueError, match="微信登录失败"):
                await code_to_session("bad_code")
