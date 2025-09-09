from __future__ import annotations

import base64
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class HasFileBinary(Protocol):
    @property
    def file_binary(self) -> bytes: ...


def b64encode(b: bytes) -> str:
    return base64.b64encode(b).decode("utf-8")


def b64decode(s: str) -> bytes:
    return base64.b64decode(s.encode("utf-8"))


def determine_mime_type(b: bytes) -> str:
    if b.startswith(b"%PDF"):
        return "application/pdf"
    if b.startswith((b"\x89PNG", b"PNG")):
        return "image/png"
    if b.startswith((b"\xff\xd8", b"JPEG")):
        return "image/jpeg"
    raise ValueError("Unsupported binary format (expect PDF/PNG/JPEG)")


def to_responses_input_parts(
    doc: HasFileBinary,
    *,
    pdf_filename: str = "document.pdf",
) -> list[dict[str, Any]]:
    """
    - For images: returns an `input_image` part with inline bytes.
    - For PDFs: returns a `file` part with a base64 data URL.
    """
    mime = determine_mime_type(doc.file_binary)

    if mime in ("image/png", "image/jpeg"):
        # Inline image bytes (Responses API)
        return [
            {
                "type": "input_image",
                "image": {
                    "data": b64encode(doc.file_binary),
                    "mime_type": mime,
                },
            }
        ]
    if mime == "application/pdf":
        part: dict[str, Any] = {
            "type": "file",
            "file": {
                "filename": pdf_filename if pdf_filename else "document.pdf",
                "file_data": f"data:application/pdf;base64,{b64encode(doc.file_binary)}",
            },
        }
        return [part]

    # Shouldn't reach here due to earlier check
    raise ValueError(f"Unsupported MIME type: {mime}")
