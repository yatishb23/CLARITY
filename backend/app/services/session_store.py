"""
Simple in-memory session store.
Stores per-session diagnostic context needed for the /chat endpoint.

In production, replace with Redis or a DB-backed store.
"""

import uuid
from datetime import datetime, timedelta
from threading import Lock

_store: dict[str, dict] = {}
_lock = Lock()
SESSION_TTL_MINUTES = 60


def create_session(context: dict) -> str:
    """Store diagnostic context and return a new session_id."""
    session_id = str(uuid.uuid4())
    with _lock:
        _store[session_id] = {
            "context": context,
            "created_at": datetime.utcnow(),
        }
    return session_id


def get_session(session_id: str) -> dict | None:
    """Retrieve context for a session, or None if expired/missing."""
    with _lock:
        entry = _store.get(session_id)
        if entry is None:
            return None
        if datetime.utcnow() - entry["created_at"] > timedelta(minutes=SESSION_TTL_MINUTES):
            del _store[session_id]
            return None
        return entry["context"]


def delete_session(session_id: str):
    with _lock:
        _store.pop(session_id, None)