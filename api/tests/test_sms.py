"""Unit tests for app.services.sms."""

from app.services.sms import generate_sms_code, send_sms_code

import pytest


class TestGenerateSmsCode:
    def test_length_is_six(self) -> None:
        code = generate_sms_code()
        assert len(code) == 6

    def test_all_digits(self) -> None:
        code = generate_sms_code()
        assert code.isdigit()

    def test_range(self) -> None:
        """The generated code should be between 100000 and 999999."""
        for _ in range(100):
            code = generate_sms_code()
            assert 100000 <= int(code) <= 999999

    def test_randomness(self) -> None:
        """Multiple calls should not always produce the same code."""
        codes = {generate_sms_code() for _ in range(50)}
        assert len(codes) > 1


@pytest.mark.asyncio
class TestSendSmsCode:
    async def test_stub_returns_true(self) -> None:
        result = await send_sms_code("13800138000", "123456")
        assert result is True
