import base64
from typing import Any

from domain.document_d import DocumentD


def b64encode(b: bytes) -> str:
    return base64.b64encode(b).decode("utf-8")

def b64decode(s: str) -> bytes:
    return base64.b64decode(s.encode("utf-8"))


def determine_mime_type(b: bytes) -> str:
    if b.startswith(b"%PDF"):
        return "application/pdf"
    elif b.startswith((b"\x89PNG", b"PNG")):
        return "image/png"
    elif b.startswith((b"\xff\xd8", b"JPEG")):
        return "image/jpeg"
    else:
        raise ValueError("Unsupported binary format for data URL")

def to_data_url(b: bytes) -> str:
    # This function creates a data URL for the given binary content.
    # We should determine if its pdf or image/png or image/jpeg
    mime = determine_mime_type(b)
    return f"data:{mime};base64,{b64encode(b)}"

def doc_to_message_parts(doc: DocumentD) -> list[dict[str, Any]]:
    """Convert DocumentD binary format to image/pdf data URL for LLM message."""
    parts: list[dict[str, Any]] = []
    data_url = to_data_url(doc.file_binary)
    parts.append({"type": "image_url", "image_url": {"url": data_url}})
    return parts