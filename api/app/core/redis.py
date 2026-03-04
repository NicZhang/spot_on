"""Redis async connection management.

Provides lifecycle functions for initializing and closing a shared
Redis connection, plus a synchronous getter for use in FastAPI
dependency injection.
"""

import redis.asyncio as redis

from app.core.config import settings

redis_client: redis.Redis | None = None


async def init_redis() -> redis.Redis:
    """Create and store a global async Redis connection."""
    global redis_client
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD or None,
        db=settings.REDIS_DB,
        decode_responses=True,
    )
    return redis_client


async def close_redis() -> None:
    """Gracefully close the Redis connection."""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


def get_redis() -> redis.Redis:
    """Return the active Redis client. Raises if not yet initialised."""
    if redis_client is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return redis_client
