from __future__ import annotations
import datetime as dt
from dataclasses import dataclass
import hashlib

from utils.converters import _b64encode, _b64decode

# TODO: Decide whether to make this immutable or not. For now we need to set document_id after creation
@dataclass(frozen=False)
class DocumentD:
    file_binary: bytes
    as_of_date: dt.date # This is uploaded date (can be determined deterministically), not the statement date (statement date will require parsing the document, idk if that is needed at this stage)
    document_id: str | None = None   # computed if None, must be set otherwise

    def __post_init__(self):
        if self.document_id is None:
            self.document_id = self.compute_id()
        if not self.document_id:
            raise ValueError("document_id must be set or computable")

    def compute_id(self) -> str:
        # Compute a SHA256 hash of the file binary as the document ID, this makes sure we can deduplicate documents if they are re-uploaded
        h = hashlib.sha256()
        h.update(self.file_binary)
        return h.hexdigest()

    def to_dict(self) -> dict:
        return {
            "document_id": self.document_id,
            "file_binary_b64": _b64encode(self.file_binary),
            "as_of_date": self.as_of_date.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict) -> DocumentD:
        return cls(
            file_binary=_b64decode(data["file_binary_b64"]),
            as_of_date=dt.date.fromisoformat(data["as_of_date"]),
            document_id=data["document_id"],
        )
