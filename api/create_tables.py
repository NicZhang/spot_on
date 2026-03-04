"""One-off script to create all tables in the database."""

import asyncio
import sys
from pathlib import Path

# Ensure the project root is on sys.path so `app.*` imports work.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlmodel import SQLModel

import app.models  # noqa: F401 — register all tables
from app.core.db import engine


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    await engine.dispose()
    print("All tables created successfully!")


if __name__ == "__main__":
    asyncio.run(main())
