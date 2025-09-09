from __future__ import annotations

from dataclasses import dataclass, field
import datetime as dt
import hashlib
from io import BytesIO
from typing import Any

from pypdf import PdfReader, PdfWriter

from domain.statement_d import StatementMetaDataD, TransactionD
from utils.converters import b64decode, b64encode, determine_mime_type


@dataclass(frozen=True)
class PageD:
    page_number: int
    file_binary: bytes  # single-page PDF or image bytes
    text: str | None = None  # extracted page text (if available)

    def __str__(self) -> str:
        mime_type = determine_mime_type(self.file_binary)
        size_kb = len(self.file_binary) / 1024

        if self.text:
            text_preview = self.text[:50].replace("\n", " ").strip()
            if len(self.text) > 50:
                text_preview += "..."
            return f"Page {self.page_number} ({mime_type}, {size_kb:.1f}KB): {text_preview}"
        else:
            return f"Page {self.page_number} ({mime_type}, {size_kb:.1f}KB)"

    def __repr__(self) -> str:
        return (
            f"PageD(page_number={self.page_number}, "
            f"file_binary=<{len(self.file_binary)} bytes>, "
            f"text={self.text!r})"
        )

    def to_dict(self, *, include_text: bool = False) -> dict[str, Any]:
        d: dict[str, Any] = {
            "page_number": self.page_number,
            "file_binary_b64": b64encode(self.file_binary),
        }
        if include_text and self.text is not None:
            d["text"] = self.text
        return d

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PageD:
        return cls(
            page_number=int(data["page_number"]),
            file_binary=b64decode(data["file_binary_b64"]),
            text=data.get("text"),
        )


@dataclass(frozen=False)
class RawDocumentD:
    file_binary: bytes
    as_of_date: dt.date
    document_id: str | None = None
    pages: list[PageD] = field(init=False, repr=False)

    def __str__(self) -> str:
        mime_type = determine_mime_type(self.file_binary)
        size_kb = len(self.file_binary) / 1024
        doc_type = "PDF" if mime_type == "application/pdf" else "Image"

        page_text = "1 page" if self.num_pages == 1 else f"{self.num_pages} pages"

        return f"{doc_type} Document ({page_text}, {size_kb:.1f}KB)"

    def __repr__(self) -> str:
        return (
            f"DocumentD(file_binary=<{len(self.file_binary)} bytes>, "
            f"as_of_date={self.as_of_date!r}, "
            f"document_id={self.document_id!r}, "
            f"pages=[{len(self.pages)} pages])"
        )

    def __post_init__(self):
        if self.document_id is None:
            self.document_id = self.compute_id()
        if not self.document_id:
            raise ValueError("document_id must be set or computable")
        self.pages = self.create_pages()

    @property
    def num_pages(self) -> int:
        return len(self.pages)

    def create_pages(self) -> list[PageD]:
        mime_type = determine_mime_type(self.file_binary)

        if mime_type == "application/pdf":
            return self._create_pages_from_pdf()
        elif mime_type in ("image/png", "image/jpeg"):
            return self._create_pages_from_image()
        else:
            raise ValueError(f"Unsupported file type: {mime_type}")

    def _create_pages_from_pdf(self) -> list[PageD]:
        buf = BytesIO(self.file_binary)
        reader = PdfReader(buf)

        pages: list[PageD] = []
        for i, page in enumerate(reader.pages):
            out = BytesIO()
            writer = PdfWriter()
            writer.add_page(page)
            writer.write(out)
            one_page_pdf = out.getvalue()

            text = page.extract_text() or None

            pages.append(
                PageD(
                    page_number=i + 1,
                    file_binary=one_page_pdf,
                    text=text,
                )
            )
        return pages

    def _create_pages_from_image(self) -> list[PageD]:
        # For images, treat the entire image as a single page
        return [
            PageD(
                page_number=1,
                file_binary=self.file_binary,
                text=None,  # TODO: Add OCR text extraction if needed
            )
        ]

    def compute_id(self) -> str:
        h = hashlib.sha256()
        h.update(self.file_binary)
        return h.hexdigest()

    def to_dict(
        self, *, include_pages: bool = False, include_page_text: bool = False
    ) -> dict[str, Any]:
        data: dict[str, Any] = {
            "document_id": self.document_id,
            "file_binary_b64": b64encode(self.file_binary),
            "as_of_date": self.as_of_date.isoformat(),
        }
        if include_pages:
            data["pages"] = [p.to_dict(include_text=include_page_text) for p in self.pages]
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RawDocumentD:
        doc = cls(
            file_binary=b64decode(data["file_binary_b64"]),
            as_of_date=dt.date.fromisoformat(data["as_of_date"]),
            document_id=data.get("document_id"),
        )
        if "pages" in data:
            doc.pages = [PageD.from_dict(p) for p in data["pages"]]
        return doc


class DocumentD(RawDocumentD):
    # After processing fields we get metadata and transactions
    metadata: StatementMetaDataD
    transactions: list[TransactionD]

    def __repr__(self) -> str:
        return (
            f"DocumentD(file_binary=<{len(self.file_binary)} bytes>, "
            f"as_of_date={self.as_of_date!r}, "
            f"document_id={self.document_id!r}, "
            f"pages=[{len(self.pages)} pages], "
            f"metadata={self.metadata!r}, "
            f"transactions=[{len(self.transactions) if self.transactions else 0} transactions])"
        )

    def __str__(self):
        return super().__str__()

    def to_dict(
        self,
        *,
        include_pages: bool = False,
        include_page_text: bool = False,
        include_metadata: bool = True,
        include_transactions: bool = True,
    ) -> dict[str, Any]:
        data = super().to_dict(include_pages=include_pages, include_page_text=include_page_text)
        if include_metadata and self.metadata:
            data["metadata"] = self.metadata.to_dict()
        if include_transactions and self.transactions:
            data["transactions"] = [t.to_dict() for t in self.transactions]
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> DocumentD:
        doc = super().from_dict(data)
        doc_d = cls(
            file_binary=doc.file_binary,
            as_of_date=doc.as_of_date,
            document_id=doc.document_id,
        )
        doc_d.pages = doc.pages
        if "metadata" in data:
            doc_d.metadata = StatementMetaDataD.from_dict(data["metadata"])
        if "transactions" in data:
            doc_d.transactions = [TransactionD.from_dict(t) for t in data["transactions"]]
        return doc_d
