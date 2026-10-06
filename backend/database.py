"""
database.py — MongoDB connection using Motor (async driver).
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "fixwithai")

_client: AsyncIOMotorClient | None = None


async def connect_db():
    global _client
    _client = AsyncIOMotorClient(MONGODB_URI)
    # Verify connection
    await _client.admin.command("ping")


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None


def get_db():
    return _client[DB_NAME]
