"""Unified serializer for converting SQLModel instances to camelCase dicts.

Handles UUID, datetime, date, time, and Decimal conversion automatically
so that the frontend receives JSON-safe, camelCase-keyed payloads.
"""

import uuid
from datetime import date, datetime, time
from decimal import Decimal


def to_camel(name: str) -> str:
    """Convert a snake_case string to camelCase."""
    components = name.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def serialize(obj) -> dict:
    """Serialize a model instance or dict into a camelCase, JSON-safe dict.

    - UUID  -> str
    - datetime -> ISO-8601 string
    - date -> ISO-8601 string
    - time -> "HH:MM"
    - Decimal -> float
    """
    if hasattr(obj, "model_dump"):
        d = obj.model_dump()
    elif isinstance(obj, dict):
        d = obj
    else:
        d = dict(obj)

    result: dict = {}
    for k, v in d.items():
        camel_key = to_camel(k)
        if isinstance(v, uuid.UUID):
            v = str(v)
        elif isinstance(v, datetime):
            v = v.isoformat()
        elif isinstance(v, date):
            v = v.isoformat()
        elif isinstance(v, time):
            v = v.strftime("%H:%M")
        elif isinstance(v, Decimal):
            v = float(v)
        result[camel_key] = v
    return result
