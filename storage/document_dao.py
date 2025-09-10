from __future__ import annotations

import json
from pathlib import Path
from typing import Protocol, TypeAlias

from domain.document_d import DocumentD

# I imagine with users, you can map user_id -> {document_id, ...}
# Right now let's assume one user, no user management etc for simplicity. This is just a MVP.
DOCUMENT_ID: TypeAlias = str
DEFAULT_DOCUMENT_SAVE_PATH: Path = Path("bin/documents.json")


class NotFound(Exception):
    pass


class DomainDAO(Protocol):
    """Protocol for document storage operations."""

    def read(self, document_id: DOCUMENT_ID) -> DocumentD:
        """Read a complete document with metadata and transactions."""
        ...

    def insert(self, document: DocumentD):
        """Insert a new document."""
        ...

    def update(self, document: DocumentD):
        """Update an existing document."""
        ...

    def delete(self, document_id: DOCUMENT_ID):
        """Delete a document."""
        ...

    def save(self, file_path: Path | None = None):
        """Persist any in-memory changes to disk or external storage."""
        ...

    def load(self, file_path: Path):
        """Load documents from disk or external storage."""
        ...


class InMemDAO:
    def __init__(self, default_save_path: Path | None = None):
        self._documents: dict[DOCUMENT_ID, DocumentD] = {}
        self._default_save_path = default_save_path or DEFAULT_DOCUMENT_SAVE_PATH

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

    def read_all(self) -> list[DocumentD]:
        """Alias for list_documents to match API expectations."""
        return self.list_documents()

    def save(self, file_path: Path | None = None) -> None:
        save_path = file_path or self._default_save_path

        documents_data = {}
        for doc_id, document in self._documents.items():
            documents_data[doc_id] = document.to_dict(
                include_pages=True,
                include_page_text=True,
                include_metadata=True,
                include_transactions=True,
            )

        if not save_path:
            raise ValueError("No save path provided and no default save path set")

        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(documents_data, f, indent=2, ensure_ascii=False)

    def load(self, file_path: Path) -> None:
        if not file_path.exists():
            raise FileNotFoundError(f"File {file_path} not found")

        with open(file_path, encoding="utf-8") as f:
            documents_data = json.load(f)

        self._documents.clear()

        for doc_id, doc_data in documents_data.items():
            try:
                document = DocumentD.from_dict(doc_data)
                # Ensure the document_id matches the key
                if document.document_id != doc_id:
                    raise ValueError(
                        f"Document ID mismatch: key={doc_id}, document_id={document.document_id}"
                    )
                self._documents[doc_id] = document
            except Exception as e:
                raise ValueError(f"Failed to load document {doc_id}: {e}") from e
