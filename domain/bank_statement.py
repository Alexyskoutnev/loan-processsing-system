from __future__ import annotations
import datetime
from enum import Enum
import dataclasses


@dataclasses.dataclass
class Statement:
    bank_name: str
    account_holder_name: str
    account_number: str
    statement_start_date: datetime.date 
    statement_end_date: datetime.date
    statement_opening_balance: float # balance at start of statement period
    statement_closing_balance: float # balance at end of statement period
    transactions: list[Transaction]

@dataclasses.dataclass
class TransactionType(Enum):
    DEBIT = "debit" # outflow from account
    CREDIT = "credit" # inflow to account

@dataclasses.dataclass
class Transaction:
    transaction_id: str
    transaction_date: datetime.date
    transaction_amount: float
    transaction_description: str
    transaction_type: TransactionType