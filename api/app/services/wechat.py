"""WeChat Mini-Program API integration.

Provides the ``code_to_session`` helper that exchanges a wx.login()
temporary *code* for the user's ``openid`` and ``session_key`` via
WeChat's ``jscode2session`` endpoint.
"""

import httpx

from app.core.config import settings


async def code_to_session(code: str) -> dict:
    """Exchange a WeChat login code for an openid and session key.

    Parameters
    ----------
    code:
        The temporary code returned by ``wx.login()`` on the client.

    Returns
    -------
    dict
        Contains at minimum ``openid`` and ``session_key``.
        May also include ``unionid`` when the Mini-Program is bound
        to a WeChat Open Platform account.

    Raises
    ------
    ValueError
        When the WeChat API returns an error (non-zero ``errcode``).
    """
    url = "https://api.weixin.qq.com/sns/jscode2session"
    params = {
        "appid": settings.WX_APP_ID,
        "secret": settings.WX_APP_SECRET,
        "js_code": code,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        data = resp.json()

    if "errcode" in data and data["errcode"] != 0:
        raise ValueError(data.get("errmsg", "微信登录失败"))

    return data
