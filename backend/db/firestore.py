"""Firestore client wrapper with in-memory fallback for testing."""

import os
import logging
from typing import Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_FIRESTORE_PROJECT_ID = os.environ.get("FIRESTORE_PROJECT_ID", "")
_USE_FIRESTORE = os.environ.get("USE_FIRESTORE", "false").lower() == "true"

# In-memory store used when Firestore is not configured (local dev / tests)
_memory_store: dict[str, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class FirestoreClient:
    """Simple Firestore wrapper with in-memory fallback."""

    def __init__(self) -> None:
        self._client: Any = None
        if _USE_FIRESTORE and _FIRESTORE_PROJECT_ID:
            try:
                from google.cloud import firestore  # type: ignore

                self._client = firestore.Client(project=_FIRESTORE_PROJECT_ID)
                logger.info(
                    "Firestore client initialized for project: %s", _FIRESTORE_PROJECT_ID
                )
            except Exception as exc:
                logger.warning("Firestore init failed: %s. Using in-memory store.", exc)

    def _col_key(self, collection: str, doc_id: str) -> str:
        return f"{collection}/{doc_id}"

    def get(self, collection: str, doc_id: str) -> dict[str, Any] | None:
        if self._client:
            doc = self._client.collection(collection).document(doc_id).get()
            return doc.to_dict() if doc.exists else None
        return _memory_store.get(self._col_key(collection, doc_id))

    def set(
        self, collection: str, doc_id: str, data: dict[str, Any], merge: bool = False
    ) -> None:
        if self._client:
            self._client.collection(collection).document(doc_id).set(data, merge=merge)
            return
        key = self._col_key(collection, doc_id)
        if merge and key in _memory_store:
            _memory_store[key].update(data)
        else:
            _memory_store[key] = dict(data)

    def update(self, collection: str, doc_id: str, data: dict[str, Any]) -> None:
        if self._client:
            self._client.collection(collection).document(doc_id).update(data)
            return
        key = self._col_key(collection, doc_id)
        if key in _memory_store:
            _memory_store[key].update(data)
        else:
            _memory_store[key] = dict(data)

    def delete(self, collection: str, doc_id: str) -> None:
        if self._client:
            self._client.collection(collection).document(doc_id).delete()
            return
        _memory_store.pop(self._col_key(collection, doc_id), None)

    def list_by_field(
        self,
        collection: str,
        field: str,
        value: Any,
        order_by: str | None = None,
    ) -> list[dict[str, Any]]:
        if self._client:
            query = self._client.collection(collection).where(field, "==", value)
            if order_by:
                query = query.order_by(order_by, direction="DESCENDING")
            return [doc.to_dict() for doc in query.stream()]
        # In-memory: scan all documents in collection
        prefix = f"{collection}/"
        results = [
            v
            for k, v in _memory_store.items()
            if k.startswith(prefix) and v.get(field) == value
        ]
        if order_by:
            results.sort(key=lambda x: x.get(order_by, ""), reverse=True)
        return results

    def clear_memory_store(self) -> None:
        """Clear the in-memory store (useful for tests)."""
        _memory_store.clear()


# Singleton instance
_db: FirestoreClient | None = None


def get_db() -> FirestoreClient:
    global _db
    if _db is None:
        _db = FirestoreClient()
    return _db
