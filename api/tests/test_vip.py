"""Unit tests for VIP endpoint request schemas."""

import pytest
from pydantic import ValidationError

from app.api.v1.endpoints.vip import SubscribeRequest


class TestSubscribeRequest:
    def test_valid(self) -> None:
        req = SubscribeRequest(plan_id="some-uuid", payment_method="wechat_pay")
        assert req.plan_id == "some-uuid"
        assert req.payment_method == "wechat_pay"

    def test_missing_plan_id(self) -> None:
        with pytest.raises(ValidationError):
            SubscribeRequest(payment_method="wechat_pay")  # type: ignore[call-arg]

    def test_missing_payment_method(self) -> None:
        with pytest.raises(ValidationError):
            SubscribeRequest(plan_id="some-uuid")  # type: ignore[call-arg]
