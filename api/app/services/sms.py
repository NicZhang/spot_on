"""SMS verification code service.

Currently a stub that always reports success. Replace the body of
``send_sms_code`` with a real provider (Aliyun SMS / Tencent Cloud SMS)
before going to production.
"""

import random


async def send_sms_code(phone: str, code: str) -> bool:
    """Send an SMS verification code to *phone*.

    Parameters
    ----------
    phone:
        The mobile number in E.164 or domestic format.
    code:
        The 6-digit verification code to deliver.

    Returns
    -------
    bool
        ``True`` if the message was accepted by the provider.

    .. note::
        Stub implementation -- always returns ``True``.
    """
    # TODO: integrate with actual SMS provider (Aliyun / Tencent Cloud)
    return True


def generate_sms_code() -> str:
    """Generate a random 6-digit numeric code as a string."""
    return f"{random.randint(100000, 999999)}"
