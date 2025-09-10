from __future__ import annotations

import datetime as dt
from decimal import Decimal
from unittest.mock import MagicMock

from domain.categories_d import TransactionCategoryD
from domain.statement_d import StatementMetaDataD, TransactionD, TransactionType
from services.reconciliation_service import StatementReconciliationService


class TestStatementReconciliationService:
    def create_mock_document(
        self,
        opening_balance: Decimal,
        closing_balance: Decimal,
        transactions: list[TransactionD] | None = None,
        has_metadata: bool = True,
        has_transactions: bool = True,
    ) -> MagicMock:
        """Create a mock document for testing."""
        doc = MagicMock()

        if has_metadata:
            doc.metadata = StatementMetaDataD(
                document_id="test_doc",
                bank_name="Test Bank",
                account_holder_name="Test User",
                account_number="12345",
                statement_start_date=dt.date(2024, 1, 1),
                statement_end_date=dt.date(2024, 1, 31),
                statement_opening_balance=opening_balance,
                statement_closing_balance=closing_balance,
            )
        else:
            doc.metadata = None

        if has_transactions and transactions is not None:
            doc.transactions = transactions
        elif has_transactions:
            doc.transactions = []
        else:
            doc.transactions = None

        return doc

    def create_transaction(
        self,
        amount: Decimal,
        transaction_type: TransactionType,
        description: str = "Test Transaction",
    ) -> TransactionD:
        """Create a test transaction."""
        return TransactionD(
            document_id="test_doc",
            transaction_date=dt.date(2024, 1, 15),
            transaction_amount=amount,
            transaction_description=description,
            transaction_type=transaction_type,
            category=TransactionCategoryD.OTHER,
        )

    def test_reconcile_balanced_statement_simple(self):
        """Test reconciliation of a perfectly balanced statement."""
        transactions = [
            self.create_transaction(Decimal("100.00"), TransactionType.CREDIT, "Income"),
            self.create_transaction(Decimal("50.00"), TransactionType.DEBIT, "Expense"),
        ]

        # Opening: 1000, Credit: +100, Debit: -50, Net: +50, Expected Closing: 1050
        doc = self.create_mock_document(
            opening_balance=Decimal("1000.00"),
            closing_balance=Decimal("1050.00"),
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is True

    def test_reconcile_balanced_statement_complex(self):
        """Test reconciliation with multiple transactions that balance."""
        transactions = [
            self.create_transaction(Decimal("500.00"), TransactionType.CREDIT),
            self.create_transaction(Decimal("300.00"), TransactionType.CREDIT),
            self.create_transaction(Decimal("200.00"), TransactionType.DEBIT),
            self.create_transaction(Decimal("150.00"), TransactionType.DEBIT),
            self.create_transaction(Decimal("75.00"), TransactionType.DEBIT),
        ]

        # Credits: 500 + 300 = 800, Debits: 200 + 150 + 75 = 425, Net: +375
        # Opening: 1000, Net: +375, Expected Closing: 1375
        doc = self.create_mock_document(
            opening_balance=Decimal("1000.00"),
            closing_balance=Decimal("1375.00"),
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is True

    def test_reconcile_unbalanced_statement(self):
        """Test reconciliation of an unbalanced statement."""
        transactions = [
            self.create_transaction(Decimal("100.00"), TransactionType.CREDIT),
            self.create_transaction(Decimal("50.00"), TransactionType.DEBIT),
        ]

        # Opening: 1000, Net: +50, Calculated: 1050, But closing is 1200 (diff: 150)
        doc = self.create_mock_document(
            opening_balance=Decimal("1000.00"),
            closing_balance=Decimal("1200.00"),  # Wrong closing balance
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is False

    def test_reconcile_no_metadata(self):
        """Test reconciliation with missing metadata."""
        transactions = [self.create_transaction(Decimal("100.00"), TransactionType.CREDIT)]

        doc = self.create_mock_document(
            opening_balance=Decimal("1000.00"),
            closing_balance=Decimal("1100.00"),
            transactions=transactions,
            has_metadata=False,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is False

    def test_reconcile_no_transactions(self):
        """Test reconciliation with missing transactions."""
        doc = self.create_mock_document(
            opening_balance=Decimal("1000.00"),
            closing_balance=Decimal("1000.00"),
            has_transactions=False,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is False

    def test_reconcile_empty_transactions(self):
        """Test reconciliation with empty transaction list."""
        doc = self.create_mock_document(
            opening_balance=Decimal("1000.00"),
            closing_balance=Decimal("1000.00"),
            transactions=[],
        )

        # Empty transactions should balance if opening == closing
        result = StatementReconciliationService.reconcile(doc)
        assert result is True

    def test_reconcile_only_credits(self):
        """Test reconciliation with only credit transactions."""
        transactions = [
            self.create_transaction(Decimal("200.00"), TransactionType.CREDIT),
            self.create_transaction(Decimal("300.00"), TransactionType.CREDIT),
        ]

        # Credits: 500, Debits: 0, Net: +500
        doc = self.create_mock_document(
            opening_balance=Decimal("1000.00"),
            closing_balance=Decimal("1500.00"),
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is True

    def test_reconcile_only_debits(self):
        """Test reconciliation with only debit transactions."""
        transactions = [
            self.create_transaction(Decimal("150.00"), TransactionType.DEBIT),
            self.create_transaction(Decimal("200.00"), TransactionType.DEBIT),
        ]

        # Credits: 0, Debits: 350, Net: -350
        doc = self.create_mock_document(
            opening_balance=Decimal("1000.00"),
            closing_balance=Decimal("650.00"),
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is True

    def test_reconcile_zero_balance_account(self):
        """Test reconciliation starting from zero balance."""
        transactions = [
            self.create_transaction(Decimal("100.00"), TransactionType.CREDIT),
            self.create_transaction(Decimal("30.00"), TransactionType.DEBIT),
        ]

        doc = self.create_mock_document(
            opening_balance=Decimal("0.00"),
            closing_balance=Decimal("70.00"),
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is True

    def test_reconcile_negative_balance_account(self):
        """Test reconciliation with negative balances."""
        transactions = [
            self.create_transaction(Decimal("50.00"), TransactionType.CREDIT),
            self.create_transaction(Decimal("200.00"), TransactionType.DEBIT),
        ]

        # Starting negative, more debits than credits
        doc = self.create_mock_document(
            opening_balance=Decimal("-100.00"),
            closing_balance=Decimal("-250.00"),
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is True

    def test_reconcile_tolerance_boundary(self):
        """Test reconciliation at the tolerance boundary."""
        transactions = [
            self.create_transaction(Decimal("100.00"), TransactionType.CREDIT),
        ]

        # Exactly at tolerance (0.00) - should pass
        doc = self.create_mock_document(
            opening_balance=Decimal("1000.00"),
            closing_balance=Decimal("1100.00"),
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is True

        # Just above tolerance - should fail
        doc.metadata.statement_closing_balance = Decimal("1100.01")
        result = StatementReconciliationService.reconcile(doc)
        assert result is False

    def test_reconcile_large_numbers(self):
        """Test reconciliation with large monetary amounts."""
        transactions = [
            self.create_transaction(Decimal("50000.00"), TransactionType.CREDIT),
            self.create_transaction(Decimal("25000.00"), TransactionType.DEBIT),
        ]

        doc = self.create_mock_document(
            opening_balance=Decimal("100000.00"),
            closing_balance=Decimal("125000.00"),
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is True

    def test_reconcile_precision_handling(self):
        """Test reconciliation with high precision decimal amounts."""
        transactions = [
            self.create_transaction(Decimal("33.333333"), TransactionType.CREDIT),
            self.create_transaction(Decimal("16.666667"), TransactionType.DEBIT),
        ]

        doc = self.create_mock_document(
            opening_balance=Decimal("1000.000000"),
            closing_balance=Decimal("1016.666666"),
            transactions=transactions,
        )

        result = StatementReconciliationService.reconcile(doc)
        assert result is True
