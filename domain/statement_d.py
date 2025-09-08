from __future__ import annotations

from dataclasses import dataclass
import datetime as dt
from decimal import Decimal
from enum import Enum
from typing import Any, ClassVar
import uuid


class TransactionType(Enum):
    DEBIT = "debit"  # outflow
    CREDIT = "credit"  # inflow


# TODO: Decide whether to make this immutable or not. For now we need to set transaction_id after creation
@dataclass(frozen=False)
class TransactionD:
    document_id: str  # link to source document
    transaction_date: dt.date
    transaction_amount: Decimal  # Decimal for money
    transaction_description: str
    transaction_type: TransactionType
    transaction_id: str | None = None  # if None, auto-UUID in __post_init__

    # ---- JSON Schema co-located with the domain type ----
    JSON_SCHEMA: ClassVar[dict[str, Any]] = {
        "type": "object",
        "properties": {
            "document_id": {"type": "string"},
            "transaction_date": {"type": "string", "format": "date"},
            # Keep money as string in JSON to avoid float drift
            "transaction_amount": {"type": "string", "pattern": r"^-?\d+(\.\d+)?$"},
            "transaction_description": {"type": "string"},
            "transaction_type": {"type": "string", "enum": ["debit", "credit"]},
            "transaction_id": {"type": "string"},
        },
        "required": [
            "document_id",
            "transaction_date",
            "transaction_amount",
            "transaction_description",
            "transaction_type",
        ],
        "additionalProperties": False,
    }

    def __str__(self) -> str:
        amount_str = f"${self.transaction_amount:,.2f}"
        if self.transaction_type == TransactionType.DEBIT:
            amount_str = f"-{amount_str}"
        else:
            amount_str = f"+{amount_str}"

        # Truncate description if too long
        desc = self.transaction_description
        if len(desc) > 40:
            desc = desc[:37] + "..."

        return f"{self.transaction_date} | {amount_str} | {desc}"

    def __repr__(self) -> str:
        return (
            f"TransactionD(document_id={self.document_id!r}, "
            f"transaction_date={self.transaction_date!r}, "
            f"transaction_amount={self.transaction_amount!r}, "
            f"transaction_description={self.transaction_description!r}, "
            f"transaction_type={self.transaction_type!r}, "
            f"transaction_id={self.transaction_id!r})"
        )

    @classmethod
    def json_schema(cls) -> dict[str, Any]:
        return cls.JSON_SCHEMA

    @classmethod
    def json_schema_array(cls) -> dict[str, Any]:
        return {"type": "array", "items": cls.JSON_SCHEMA}

    def __post_init__(self):
        if self.transaction_id is None:
            # UUID is fine for uniqueness across repeated/recurring items
            self.transaction_id = str(uuid.uuid4())
        if not self.transaction_id:
            raise ValueError("transaction_id must be set or computable")

    def to_dict(self) -> dict[str, Any]:
        return {
            "document_id": self.document_id,
            "transaction_date": self.transaction_date.isoformat(),  # YYYY-MM-DD
            "transaction_amount": str(self.transaction_amount),  # JSON-safe
            "transaction_description": self.transaction_description,
            "transaction_type": self.transaction_type.value,  # "debit"/"credit"
            "transaction_id": self.transaction_id,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TransactionD:
        return cls(
            transaction_id=data.get("transaction_id"),
            document_id=data["document_id"],
            transaction_date=dt.date.fromisoformat(data["transaction_date"]),
            transaction_amount=Decimal(data["transaction_amount"]),
            transaction_description=data["transaction_description"],
            transaction_type=TransactionType(data["transaction_type"]),
        )


# TODO: Decide whether to make this immutable or not. For now we need to set document_id after creation
@dataclass(frozen=False)
class StatementMetaDataD:
    document_id: str  # link to source document
    bank_name: str
    account_holder_name: str
    account_number: str
    statement_start_date: dt.date
    statement_end_date: dt.date
    statement_opening_balance: Decimal
    statement_closing_balance: Decimal

    # ---- JSON Schema co-located with the domain type ----
    JSON_SCHEMA: ClassVar[dict[str, Any]] = {
        "type": "object",
        "properties": {
            "document_id": {"type": "string"},
            "bank_name": {"type": "string"},
            "account_holder_name": {"type": "string"},
            "account_number": {"type": "string"},
            "statement_start_date": {"type": "string", "format": "date"},
            "statement_end_date": {"type": "string", "format": "date"},
            "statement_opening_balance": {"type": "string", "pattern": r"^-?\d+(\.\d+)?$"},
            "statement_closing_balance": {"type": "string", "pattern": r"^-?\d+(\.\d+)?$"},
        },
        "required": [
            "document_id",
            "bank_name",
            "account_holder_name",
            "account_number",
            "statement_start_date",
            "statement_end_date",
            "statement_opening_balance",
            "statement_closing_balance",
        ],
        "additionalProperties": False,
    }

    def __str__(self) -> str:
        masked_account = (
            f"***{self.account_number[-4:]}" if len(self.account_number) >= 4 else "***"
        )

        opening = f"${self.statement_opening_balance:,.2f}"
        closing = f"${self.statement_closing_balance:,.2f}"

        return (
            f"{self.bank_name} Statement ({self.account_holder_name}, "
            f"Account {masked_account}) {self.statement_start_date} to "
            f"{self.statement_end_date}: {opening} → {closing}"
        )

    def __repr__(self) -> str:
        return (
            f"StatementMetaDataD(document_id={self.document_id!r}, "
            f"bank_name={self.bank_name!r}, "
            f"account_holder_name={self.account_holder_name!r}, "
            f"account_number={self.account_number!r}, "
            f"statement_start_date={self.statement_start_date!r}, "
            f"statement_end_date={self.statement_end_date!r}, "
            f"statement_opening_balance={self.statement_opening_balance!r}, "
            f"statement_closing_balance={self.statement_closing_balance!r})"
        )

    @classmethod
    def json_schema(cls) -> dict[str, Any]:
        return cls.JSON_SCHEMA

    @classmethod
    def json_schema_array(cls) -> dict[str, Any]:
        return {"type": "array", "items": cls.JSON_SCHEMA}

    def to_dict(self) -> dict[str, Any]:
        return {
            "document_id": self.document_id,  # included for round-trip
            "bank_name": self.bank_name,
            "account_holder_name": self.account_holder_name,
            "account_number": self.account_number,
            "statement_start_date": self.statement_start_date.isoformat(),  # YYYY-MM-DD
            "statement_end_date": self.statement_end_date.isoformat(),  # YYYY-MM-DD
            "statement_opening_balance": str(self.statement_opening_balance),
            "statement_closing_balance": str(self.statement_closing_balance),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> StatementMetaDataD:
        return cls(
            document_id=data["document_id"],
            bank_name=data["bank_name"],
            account_holder_name=data["account_holder_name"],
            account_number=data["account_number"],
            statement_start_date=dt.date.fromisoformat(data["statement_start_date"]),
            statement_end_date=dt.date.fromisoformat(data["statement_end_date"]),
            statement_opening_balance=Decimal(data["statement_opening_balance"]),
            statement_closing_balance=Decimal(data["statement_closing_balance"]),
        )
