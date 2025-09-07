from __future__ import annotations
import datetime as dt
import uuid
from enum import Enum
from dataclasses import dataclass
from typing import Any
from decimal import Decimal
import hashlib

from utils.converters import _b64encode, _b64decode


class TransactionType(Enum):
    DEBIT = "debit"    # outflow
    CREDIT = "credit"  # inflow

# TODO: Decide whether to make this immutable or not. For now we need to set document_id after creation
@dataclass(frozen=False)
class Document:
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
    def from_dict(cls, data: dict) -> Document:
        return cls(
            file_binary=_b64decode(data["file_binary_b64"]),
            as_of_date=dt.date.fromisoformat(data["as_of_date"]),
            document_id=data["document_id"],
        )

# TODO: Decide whether to make this immutable or not. For now we need to set document_id after creation
@dataclass(frozen=False)
class Transaction:
    document_id: str                  # link to source document
    transaction_date: dt.date
    transaction_amount: Decimal       # prefer Decimal for money
    transaction_description: str
    transaction_type: TransactionType
    transaction_id: str | None = None  # computed if None, must be set otherwise by caller (If there is a ID in the source data, use it. If not, compute a UUID)

    def __post_init__(self):
        if self.transaction_id is None:
            # I think it's better to use a UUID here instead of a hash, because the same transaction might appear in different statements (e.g. recurring payments)
            self.transaction_id = str(uuid.uuid4())
        if not self.transaction_id:
            raise ValueError("transaction_id must be set or computable")

    def to_dict(self) -> dict[str, Any]:
        return {
            "document_id": self.document_id,
            "transaction_date": self.transaction_date.isoformat(), # YYYY-MM-DD
            "transaction_amount": str(self.transaction_amount),  # store as string to avoid float precision issues
            "transaction_description": self.transaction_description, # free text
            "transaction_type": self.transaction_type.value, # store as string AKA either "debit" or "credit"
            "transaction_id": self.transaction_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Transaction:
        return cls(
            transaction_id=data["transaction_id"],
            document_id=data["document_id"],
            transaction_date=dt.date.fromisoformat(data["transaction_date"]),
            transaction_amount=Decimal(data["transaction_amount"]),
            transaction_description=data["transaction_description"],
            transaction_type=TransactionType(data["transaction_type"]),
        )

# TODO: Decide whether to make this immutable or not. For now we need to set document_id after creation
@dataclass(frozen=False)
class StatementMetaData:
    document_id: str  # link to source document
    bank_name: str
    account_holder_name: str
    account_number: str
    statement_start_date: dt.date
    statement_end_date: dt.date
    statement_opening_balance: Decimal
    statement_closing_balance: Decimal

    def to_dict(self) -> dict[str, Any]:
        return {
            "bank_name": self.bank_name,
            "account_holder_name": self.account_holder_name,
            "account_number": self.account_number,
            "statement_start_date": self.statement_start_date.isoformat(), # YYYY-MM-DD
            "statement_end_date": self.statement_end_date.isoformat(), # YYYY-MM-DD
            "statement_opening_balance": str(self.statement_opening_balance),
            "statement_closing_balance": str(self.statement_closing_balance),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> StatementMetaData:
        return cls(
            bank_name=data["bank_name"],
            account_holder_name=data["account_holder_name"],
            account_number=data["account_number"],
            statement_start_date=dt.date.fromisoformat(data["statement_start_date"]),
            statement_end_date=dt.date.fromisoformat(data["statement_end_date"]),
            statement_opening_balance=Decimal(data["statement_opening_balance"]),
            statement_closing_balance=Decimal(data["statement_closing_balance"]),
        )
