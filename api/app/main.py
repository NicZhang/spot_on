"""FastAPI application entry-point.

- Registers middleware (CORS, method-override).
- Initialises the database (dev-mode ``create_all``) and Redis on startup.
- Mounts the ``/api/v1`` router.
- Provides a global ``HTTPException`` handler that returns the unified
  error envelope expected by the frontend.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import SQLModel

from app.core.config import settings
from app.core.db import engine
from app.core.middleware import MethodOverrideMiddleware
from app.core.redis import close_redis, init_redis

import app.models  # noqa: F401 -- register all SQLModel tables before create_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    # Startup: create tables (dev convenience; use Alembic for production)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    await init_redis()
    yield
    # Shutdown
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# -- Middleware (order matters: last added = first executed) ----------------
app.add_middleware(MethodOverrideMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -- Global exception handler ---------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Map ``HTTPException`` status codes to the project's error code
    convention and return the unified error envelope.
    """
    error_map: dict[int, int] = {
        400: 4000,
        401: 4001,
        403: 4003,
        404: 4004,
        409: 4005,
        422: 4007,
        429: 4006,
        500: 1,
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "code": error_map.get(exc.status_code, 1),
            "message": str(exc.detail),
            "data": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# -- API router ------------------------------------------------------------
try:
    from app.api.v1.router import api_router

    app.include_router(api_router, prefix=settings.API_V1_STR)
except ImportError:
    pass  # Router not yet created


# -- Health check ----------------------------------------------------------
@app.get("/health")
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}
