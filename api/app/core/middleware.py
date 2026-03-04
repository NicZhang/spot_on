"""HTTP method override middleware.

Some clients (notably older WeChat webview versions) cannot send
``PATCH`` / ``PUT`` / ``DELETE`` requests directly.  This middleware
lets them send a ``POST`` with an ``X-HTTP-Method-Override`` header
whose value is the desired method.
"""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class MethodOverrideMiddleware(BaseHTTPMiddleware):
    """Translate ``POST`` + ``X-HTTP-Method-Override`` into the real method."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method == "POST":
            override = request.headers.get("X-HTTP-Method-Override", "").upper()
            if override in ("PATCH", "PUT", "DELETE"):
                request.scope["method"] = override
        return await call_next(request)
