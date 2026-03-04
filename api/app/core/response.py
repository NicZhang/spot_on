"""Unified API response helpers.

Every endpoint should return data through these helpers so the
frontend receives a consistent JSON envelope:

    {
        "success": true/false,
        "code": <int>,
        "message": "<human-readable>",
        "data": <payload or null>,
        "timestamp": "<ISO-8601 UTC>"
    }
"""

from datetime import datetime, timezone
from math import ceil

from fastapi.responses import JSONResponse


def success_response(
    data: dict | list | None = None,
    message: str = "操作成功",
    code: int = 0,
) -> dict:
    """Wrap *data* in the standard success envelope."""
    return {
        "success": True,
        "code": code,
        "message": message,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def paginated_response(
    items: list,
    total: int,
    page: int,
    page_size: int,
    message: str = "查询成功",
) -> dict:
    """Build a paginated success envelope with page metadata."""
    return success_response(
        data={
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "pageCount": ceil(total / page_size) if page_size > 0 else 0,
        },
        message=message,
    )


def error_response(
    code: int,
    message: str,
    status_code: int = 400,
    errors: list | None = None,
) -> JSONResponse:
    """Return a ``JSONResponse`` with the standard error envelope.

    Use this inside endpoint handlers when you need fine-grained control
    over the HTTP status code (as opposed to raising ``HTTPException``
    which is caught by the global exception handler in ``main.py``).
    """
    content: dict = {
        "success": False,
        "code": code,
        "message": message,
        "data": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if errors:
        content["errors"] = errors
    return JSONResponse(status_code=status_code, content=content)
