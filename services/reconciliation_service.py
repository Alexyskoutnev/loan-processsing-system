from __future__ import annotations

from decimal import Decimal
import logging

from domain.document_d import DocumentD
from domain.statement_d import TransactionType


class StatementReconciliationService:
    TOLERANCE = Decimal("0.00")

    @classmethod
    def reconcile(cls, document: DocumentD) -> bool:
        """
        Check if document balances within tolerance.

        Returns True if balanced, False otherwise.
        Returns False if missing metadata or transactions.
        """
        if not document.metadata or not document.transactions:
            return False

        # Calculate totals
        total_debits = sum(
            t.transaction_amount
            for t in document.transactions
            if t.transaction_type == TransactionType.DEBIT
        )

        total_credits = sum(
            t.transaction_amount
            for t in document.transactions
            if t.transaction_type == TransactionType.CREDIT
        )

        # Check balance
        net_change = total_credits - total_debits
        expected_closing = document.metadata.statement_opening_balance + net_change
        difference = abs(expected_closing - document.metadata.statement_closing_balance)

        is_balanced = difference <= cls.TOLERANCE

        if not is_balanced:
            logging.error(
                f"Reconciliation mismatch: "
                f"Opening {document.metadata.statement_opening_balance} + "
                f"Net {net_change} = {expected_closing} "
                f"(Expected: {document.metadata.statement_closing_balance}, "
                f"Diff: {difference})"
            )

        return is_balanced
