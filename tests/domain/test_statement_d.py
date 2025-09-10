from __future__ import annotations

import datetime as dt
from decimal import Decimal
import uuid

from domain.categories_d import TransactionCategoryD
from domain.statement_d import StatementMetaDataD, TransactionD, TransactionType


class TestTransactionD:
    def test_transaction_creation_with_minimal_data(self):
        """Test creating a transaction with minimal required data."""
        txn = TransactionD(
            document_id="test_doc",
            transaction_date=dt.date(2024, 1, 15),
            transaction_amount=Decimal("100.50"),
            transaction_description="Test transaction",
            transaction_type=TransactionType.DEBIT,
        )

        assert txn.document_id == "test_doc"
        assert txn.transaction_date == dt.date(2024, 1, 15)
        assert txn.transaction_amount == Decimal("100.50")
        assert txn.transaction_description == "Test transaction"
        assert txn.transaction_type == TransactionType.DEBIT
        assert txn.transaction_id is not None  # Auto-generated UUID
        assert txn.category is None  # Default None

    def test_transaction_creation_with_all_data(self):
        """Test creating a transaction with all fields including category."""
        custom_id = str(uuid.uuid4())
        txn = TransactionD(
            document_id="test_doc",
            transaction_date=dt.date(2024, 1, 15),
            transaction_amount=Decimal("100.50"),
            transaction_description="Test transaction",
            transaction_type=TransactionType.CREDIT,
            transaction_id=custom_id,
            category=TransactionCategoryD.SALARY_WAGES,
        )

        assert txn.transaction_id == custom_id
        assert txn.category == TransactionCategoryD.SALARY_WAGES

    def test_transaction_to_dict_with_category(self):
        """Test transaction serialization to dict with category."""
        txn = TransactionD(
            document_id="doc123",
            transaction_date=dt.date(2024, 1, 15),
            transaction_amount=Decimal("1000.00"),
            transaction_description="Salary payment",
            transaction_type=TransactionType.CREDIT,
            category=TransactionCategoryD.SALARY_WAGES,
        )

        result = txn.to_dict()

        assert result["document_id"] == "doc123"
        assert result["transaction_date"] == "2024-01-15"
        assert result["transaction_amount"] == "1000.00"
        assert result["transaction_description"] == "Salary payment"
        assert result["transaction_type"] == "credit"
        assert result["category"] == "salary_wages"
        assert "transaction_id" in result

    def test_transaction_to_dict_without_category(self):
        """Test transaction serialization to dict without category."""
        txn = TransactionD(
            document_id="doc123",
            transaction_date=dt.date(2024, 1, 15),
            transaction_amount=Decimal("1000.00"),
            transaction_description="Salary payment",
            transaction_type=TransactionType.CREDIT,
        )

        result = txn.to_dict()

        assert "category" not in result
        assert len(result) == 6  # All fields except category

    def test_transaction_from_dict_with_category(self):
        """Test transaction deserialization from dict with category."""
        data = {
            "document_id": "doc123",
            "transaction_date": "2024-01-15",
            "transaction_amount": "1000.00",
            "transaction_description": "Salary payment",
            "transaction_type": "credit",
            "transaction_id": "test-id-123",
            "category": "salary_wages",
        }

        txn = TransactionD.from_dict(data)

        assert txn.document_id == "doc123"
        assert txn.transaction_date == dt.date(2024, 1, 15)
        assert txn.transaction_amount == Decimal("1000.00")
        assert txn.transaction_description == "Salary payment"
        assert txn.transaction_type == TransactionType.CREDIT
        assert txn.transaction_id == "test-id-123"
        assert txn.category == TransactionCategoryD.SALARY_WAGES

    def test_transaction_from_dict_without_category(self):
        """Test transaction deserialization from dict without category."""
        data = {
            "document_id": "doc123",
            "transaction_date": "2024-01-15",
            "transaction_amount": "1000.00",
            "transaction_description": "Salary payment",
            "transaction_type": "credit",
        }

        txn = TransactionD.from_dict(data)

        assert txn.category is None

    def test_transaction_from_dict_invalid_category(self):
        """Test transaction deserialization with invalid category falls back to ERROR."""
        data = {
            "document_id": "doc123",
            "transaction_date": "2024-01-15",
            "transaction_amount": "1000.00",
            "transaction_description": "Salary payment",
            "transaction_type": "credit",
            "category": "invalid_category",
        }

        txn = TransactionD.from_dict(data)

        assert txn.category == TransactionCategoryD.ERROR

    def test_transaction_round_trip_serialization(self):
        """Test that serialization and deserialization preserves all data."""
        original = TransactionD(
            document_id="doc123",
            transaction_date=dt.date(2024, 1, 15),
            transaction_amount=Decimal("1000.00"),
            transaction_description="Salary payment",
            transaction_type=TransactionType.CREDIT,
            category=TransactionCategoryD.SALARY_WAGES,
        )

        # Serialize and deserialize
        data = original.to_dict()
        restored = TransactionD.from_dict(data)

        assert restored.document_id == original.document_id
        assert restored.transaction_date == original.transaction_date
        assert restored.transaction_amount == original.transaction_amount
        assert restored.transaction_description == original.transaction_description
        assert restored.transaction_type == original.transaction_type
        assert restored.transaction_id == original.transaction_id
        assert restored.category == original.category

    def test_transaction_str_representation_with_category(self):
        """Test string representation includes category when present."""
        txn = TransactionD(
            document_id="doc123",
            transaction_date=dt.date(2024, 1, 15),
            transaction_amount=Decimal("1000.00"),
            transaction_description="Salary payment",
            transaction_type=TransactionType.CREDIT,
            category=TransactionCategoryD.SALARY_WAGES,
        )

        str_repr = str(txn)
        assert "[salary_wages]" in str_repr
        assert "2024-01-15" in str_repr
        assert "+$1,000.00" in str_repr

    def test_transaction_str_representation_without_category(self):
        """Test string representation without category."""
        txn = TransactionD(
            document_id="doc123",
            transaction_date=dt.date(2024, 1, 15),
            transaction_amount=Decimal("1000.00"),
            transaction_description="Salary payment",
            transaction_type=TransactionType.DEBIT,
        )

        str_repr = str(txn)
        assert "[" not in str_repr  # No category bracket
        assert "-$1,000.00" in str_repr  # Debit shows negative

    def test_transaction_table_str(self):
        """Test table string representation of transaction list."""
        transactions = [
            TransactionD(
                document_id="doc1",
                transaction_date=dt.date(2024, 1, 15),
                transaction_amount=Decimal("1000.00"),
                transaction_description="Salary",
                transaction_type=TransactionType.CREDIT,
                category=TransactionCategoryD.SALARY_WAGES,
            ),
            TransactionD(
                document_id="doc1",
                transaction_date=dt.date(2024, 1, 16),
                transaction_amount=Decimal("50.00"),
                transaction_description="Coffee",
                transaction_type=TransactionType.DEBIT,
                category=TransactionCategoryD.DINING,
            ),
        ]

        table_str = TransactionD.table_str(transactions)

        assert "Date" in table_str
        assert "Amount" in table_str
        assert "Type" in table_str
        assert "Description" in table_str
        assert "2024-01-15" in table_str
        assert "+$1,000.00" in table_str
        assert "-$50.00" in table_str
        assert "[salary_wages]" in table_str
        assert "[dining]" in table_str


class TestStatementMetaDataD:
    def test_statement_metadata_creation(self):
        """Test creating statement metadata with all required fields."""
        metadata = StatementMetaDataD(
            document_id="doc123",
            bank_name="Test Bank",
            account_holder_name="John Doe",
            account_number="1234567890",
            statement_start_date=dt.date(2024, 1, 1),
            statement_end_date=dt.date(2024, 1, 31),
            statement_opening_balance=Decimal("1000.00"),
            statement_closing_balance=Decimal("1500.00"),
        )

        assert metadata.document_id == "doc123"
        assert metadata.bank_name == "Test Bank"
        assert metadata.account_holder_name == "John Doe"
        assert metadata.account_number == "1234567890"
        assert metadata.statement_start_date == dt.date(2024, 1, 1)
        assert metadata.statement_end_date == dt.date(2024, 1, 31)
        assert metadata.statement_opening_balance == Decimal("1000.00")
        assert metadata.statement_closing_balance == Decimal("1500.00")

    def test_statement_metadata_to_dict(self):
        """Test statement metadata serialization to dict."""
        metadata = StatementMetaDataD(
            document_id="doc123",
            bank_name="Test Bank",
            account_holder_name="John Doe",
            account_number="1234567890",
            statement_start_date=dt.date(2024, 1, 1),
            statement_end_date=dt.date(2024, 1, 31),
            statement_opening_balance=Decimal("1000.00"),
            statement_closing_balance=Decimal("1500.00"),
        )

        result = metadata.to_dict()

        assert result["document_id"] == "doc123"
        assert result["bank_name"] == "Test Bank"
        assert result["account_holder_name"] == "John Doe"
        assert result["account_number"] == "1234567890"
        assert result["statement_start_date"] == "2024-01-01"
        assert result["statement_end_date"] == "2024-01-31"
        assert result["statement_opening_balance"] == "1000.00"
        assert result["statement_closing_balance"] == "1500.00"

    def test_statement_metadata_from_dict(self):
        """Test statement metadata deserialization from dict."""
        data = {
            "document_id": "doc123",
            "bank_name": "Test Bank",
            "account_holder_name": "John Doe",
            "account_number": "1234567890",
            "statement_start_date": "2024-01-01",
            "statement_end_date": "2024-01-31",
            "statement_opening_balance": "1000.00",
            "statement_closing_balance": "1500.00",
        }

        metadata = StatementMetaDataD.from_dict(data)

        assert metadata.document_id == "doc123"
        assert metadata.bank_name == "Test Bank"
        assert metadata.account_holder_name == "John Doe"
        assert metadata.account_number == "1234567890"
        assert metadata.statement_start_date == dt.date(2024, 1, 1)
        assert metadata.statement_end_date == dt.date(2024, 1, 31)
        assert metadata.statement_opening_balance == Decimal("1000.00")
        assert metadata.statement_closing_balance == Decimal("1500.00")

    def test_statement_metadata_round_trip_serialization(self):
        """Test that serialization and deserialization preserves all data."""
        original = StatementMetaDataD(
            document_id="doc123",
            bank_name="Test Bank",
            account_holder_name="John Doe",
            account_number="1234567890",
            statement_start_date=dt.date(2024, 1, 1),
            statement_end_date=dt.date(2024, 1, 31),
            statement_opening_balance=Decimal("1000.00"),
            statement_closing_balance=Decimal("1500.00"),
        )

        # Serialize and deserialize
        data = original.to_dict()
        restored = StatementMetaDataD.from_dict(data)

        assert restored.document_id == original.document_id
        assert restored.bank_name == original.bank_name
        assert restored.account_holder_name == original.account_holder_name
        assert restored.account_number == original.account_number
        assert restored.statement_start_date == original.statement_start_date
        assert restored.statement_end_date == original.statement_end_date
        assert restored.statement_opening_balance == original.statement_opening_balance
        assert restored.statement_closing_balance == original.statement_closing_balance

    def test_statement_metadata_str_representation(self):
        """Test string representation masks account number."""
        metadata = StatementMetaDataD(
            document_id="doc123",
            bank_name="Test Bank",
            account_holder_name="John Doe",
            account_number="1234567890",
            statement_start_date=dt.date(2024, 1, 1),
            statement_end_date=dt.date(2024, 1, 31),
            statement_opening_balance=Decimal("1000.00"),
            statement_closing_balance=Decimal("1500.00"),
        )

        str_repr = str(metadata)
        assert "Test Bank" in str_repr
        assert "John Doe" in str_repr
        assert "***7890" in str_repr  # Masked account number
        assert "1234567890" not in str_repr  # Full account number not shown
        assert "$1,000.00 → $1,500.00" in str_repr
