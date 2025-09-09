from __future__ import annotations

from typing import Protocol, TypeAlias

from domain.document_d import DocumentD

# I imagine with users, you can map user_id -> {document_id, ...}
# Right now let's assume one user, no user management etc for simplicity. This is just a MVP.
DOCUMENT_ID: TypeAlias = str


class NotFound(Exception):
    pass


class DomainDAO(Protocol):
    """Protocol for document storage operations."""

    def read(self, document_id: DOCUMENT_ID) -> DocumentD:
        """Read a complete document with metadata and transactions."""
        ...

    def insert(self, document: DocumentD) -> None:
        """Insert a new document."""
        ...

    def update(self, document: DocumentD) -> None:
        """Update an existing document."""
        ...

    def delete(self, document_id: DOCUMENT_ID) -> None:
        """Delete a document."""
        ...


class InMemDAO:
    def __init__(self):
        self._documents: dict[DOCUMENT_ID, DocumentD] = {}

    def read(self, document_id: DOCUMENT_ID) -> DocumentD:
        if document_id not in self._documents:
            raise NotFound(f"Document {document_id} not found")
        return self._documents[document_id]

    def insert(self, document: DocumentD) -> None:
        if not document.document_id:
            raise ValueError("Document must have document_id")
        if document.document_id in self._documents:
            raise ValueError(f"Document {document.document_id} already exists")
        self._documents[document.document_id] = document

    def update(self, document: DocumentD) -> None:
        if not document.document_id:
            raise ValueError("Document must have document_id")
        if document.document_id not in self._documents:
            raise NotFound(f"Document {document.document_id} not found")
        self._documents[document.document_id] = document

    def delete(self, document_id: DOCUMENT_ID) -> None:
        if document_id not in self._documents:
            raise NotFound(f"Document {document_id} not found")
        del self._documents[document_id]

    def list_documents(self) -> list[DocumentD]:
        return list(self._documents.values())
