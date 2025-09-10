from __future__ import annotations

import datetime as dt
from decimal import Decimal
from io import BytesIO

from pypdf import PdfWriter

from domain.categories_d import TransactionCategoryD
from domain.document_d import DocumentD, PageD, RawDocumentD
from domain.statement_d import StatementMetaDataD, TransactionD, TransactionType


def create_test_pdf() -> bytes:
    """Create a minimal test PDF for testing."""
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)  # Standard letter size

    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def create_test_image() -> bytes:
    """Create a minimal test image (PNG) for testing."""
    # Minimal 1x1 PNG image
    return bytes(
        [
            0x89,
            0x50,
            0x4E,
            0x47,
            0x0D,
            0x0A,
            0x1A,
            0x0A,  # PNG signature
            0x00,
            0x00,
            0x00,
            0x0D,  # IHDR chunk length
            0x49,
            0x48,
            0x44,
            0x52,  # IHDR
            0x00,
            0x00,
            0x00,
            0x01,  # Width: 1
            0x00,
            0x00,
            0x00,
            0x01,  # Height: 1
            0x08,
            0x02,  # Bit depth: 8, Color type: 2 (RGB)
            0x00,
            0x00,
            0x00,  # Compression, Filter, Interlace
            0x90,
            0x77,
            0x53,
            0xDE,  # CRC
            0x00,
            0x00,
            0x00,
            0x0C,  # IDAT chunk length
            0x49,
            0x44,
            0x41,
            0x54,  # IDAT
            0x08,
            0x99,
            0x01,
            0x01,
            0x00,
            0x00,
            0x00,
            0xFF,
            0xFF,
            0x00,
            0x00,
            0x00,
            0x02,
            0x00,
            0x01,  # Image data
            0xE2,
            0x21,
            0xBC,
            0x33,  # CRC
            0x00,
            0x00,
            0x00,
            0x00,  # IEND chunk length
            0x49,
            0x45,
            0x4E,
            0x44,  # IEND
            0xAE,
            0x42,
            0x60,
            0x82,  # CRC
        ]
    )


class TestPageD:
    def test_page_creation(self):
        """Test creating a page with basic data."""
        test_data = b"test page content"
        page = PageD(page_number=1, file_binary=test_data, text="Sample text content")

        assert page.page_number == 1
        assert page.file_binary == test_data
        assert page.text == "Sample text content"

    def test_page_creation_without_text(self):
        """Test creating a page without text content."""
        test_data = b"test page content"
        page = PageD(page_number=1, file_binary=test_data)

        assert page.page_number == 1
        assert page.file_binary == test_data
        assert page.text is None

    def test_page_str_representation_with_text(self):
        """Test string representation of page with text."""
        test_data = create_test_image()
        page = PageD(
            page_number=1,
            file_binary=test_data,
            text="This is a long text that should be truncated when displayed in the string representation",
        )

        str_repr = str(page)
        assert "Page 1" in str_repr
        assert "image/png" in str_repr
        assert "This is a long text that should be truncated" in str_repr
        assert "..." in str_repr  # Text should be truncated

    def test_page_str_representation_without_text(self):
        """Test string representation of page without text."""
        test_data = create_test_image()
        page = PageD(page_number=2, file_binary=test_data)

        str_repr = str(page)
        assert "Page 2" in str_repr
        assert "image/png" in str_repr
        assert "KB)" in str_repr

    def test_page_to_dict_with_text(self):
        """Test page serialization to dict with text."""
        test_data = b"test content"
        page = PageD(page_number=1, file_binary=test_data, text="Sample text")

        result = page.to_dict(include_text=True)

        assert result["page_number"] == 1
        assert "file_binary_b64" in result
        assert result["text"] == "Sample text"

    def test_page_to_dict_without_text(self):
        """Test page serialization to dict without text."""
        test_data = b"test content"
        page = PageD(page_number=1, file_binary=test_data, text="Sample text")

        result = page.to_dict(include_text=False)

        assert result["page_number"] == 1
        assert "file_binary_b64" in result
        assert "text" not in result

    def test_page_from_dict(self):
        """Test page deserialization from dict."""
        test_data = b"test content"
        page = PageD(page_number=1, file_binary=test_data, text="Sample text")

        # Round trip
        data = page.to_dict(include_text=True)
        restored = PageD.from_dict(data)

        assert restored.page_number == page.page_number
        assert restored.file_binary == page.file_binary
        assert restored.text == page.text


class TestRawDocumentD:
    def test_raw_document_creation_with_pdf(self):
        """Test creating a raw document with PDF content."""
        pdf_data = create_test_pdf()
        doc = RawDocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))

        assert doc.file_binary == pdf_data
        assert doc.as_of_date == dt.date(2024, 1, 15)
        assert doc.document_id is not None  # Auto-generated
        assert len(doc.pages) == 1  # Single page PDF
        assert doc.num_pages == 1

    def test_raw_document_creation_with_image(self):
        """Test creating a raw document with image content."""
        image_data = create_test_image()
        doc = RawDocumentD(file_binary=image_data, as_of_date=dt.date(2024, 1, 15))

        assert doc.file_binary == image_data
        assert doc.as_of_date == dt.date(2024, 1, 15)
        assert doc.document_id is not None
        assert len(doc.pages) == 1  # Single page image
        assert doc.num_pages == 1

    def test_raw_document_with_custom_id(self):
        """Test creating a raw document with custom document ID."""
        pdf_data = create_test_pdf()
        custom_id = "custom-doc-id-123"
        doc = RawDocumentD(
            file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15), document_id=custom_id
        )

        assert doc.document_id == custom_id

    def test_raw_document_str_representation_pdf(self):
        """Test string representation of PDF document."""
        pdf_data = create_test_pdf()
        doc = RawDocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))

        str_repr = str(doc)
        assert "PDF Document" in str_repr
        assert "1 page" in str_repr
        assert "KB)" in str_repr

    def test_raw_document_str_representation_image(self):
        """Test string representation of image document."""
        image_data = create_test_image()
        doc = RawDocumentD(file_binary=image_data, as_of_date=dt.date(2024, 1, 15))

        str_repr = str(doc)
        assert "Image Document" in str_repr
        assert "1 page" in str_repr

    def test_raw_document_to_dict(self):
        """Test raw document serialization to dict."""
        pdf_data = create_test_pdf()
        doc = RawDocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))

        result = doc.to_dict()

        assert "file_binary_b64" in result
        assert result["as_of_date"] == "2024-01-15"
        assert result["document_id"] == doc.document_id

    def test_raw_document_to_dict_with_pages(self):
        """Test raw document serialization with pages included."""
        pdf_data = create_test_pdf()
        doc = RawDocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))

        result = doc.to_dict(include_pages=True)

        assert "pages" in result
        assert len(result["pages"]) == doc.num_pages

    def test_raw_document_from_dict(self):
        """Test raw document deserialization from dict."""
        pdf_data = create_test_pdf()
        original = RawDocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))

        # Round trip
        data = original.to_dict(include_pages=True)
        restored = RawDocumentD.from_dict(data)

        assert restored.file_binary == original.file_binary
        assert restored.as_of_date == original.as_of_date
        assert restored.document_id == original.document_id
        assert len(restored.pages) == len(original.pages)


class TestDocumentD:
    def create_test_transaction(self) -> TransactionD:
        """Helper to create a test transaction."""
        return TransactionD(
            document_id="test_doc",
            transaction_date=dt.date(2024, 1, 15),
            transaction_amount=Decimal("100.00"),
            transaction_description="Test transaction",
            transaction_type=TransactionType.DEBIT,
            category=TransactionCategoryD.GROCERIES,
        )

    def create_test_metadata(self) -> StatementMetaDataD:
        """Helper to create test metadata."""
        return StatementMetaDataD(
            document_id="test_doc",
            bank_name="Test Bank",
            account_holder_name="John Doe",
            account_number="1234567890",
            statement_start_date=dt.date(2024, 1, 1),
            statement_end_date=dt.date(2024, 1, 31),
            statement_opening_balance=Decimal("1000.00"),
            statement_closing_balance=Decimal("900.00"),
        )

    def test_document_creation(self):
        """Test creating a document with all components."""
        pdf_data = create_test_pdf()
        doc = DocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))

        # Set the processed data
        doc.metadata = self.create_test_metadata()
        doc.transactions = [self.create_test_transaction()]

        assert doc.file_binary == pdf_data
        assert doc.as_of_date == dt.date(2024, 1, 15)
        assert doc.metadata is not None
        assert len(doc.transactions) == 1
        assert doc.num_pages == 1

    def test_document_str_representation(self):
        """Test document string representation."""
        pdf_data = create_test_pdf()
        doc = DocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))
        doc.metadata = self.create_test_metadata()
        doc.transactions = [self.create_test_transaction()]

        str_repr = str(doc)
        # Should use the parent's string representation
        assert "PDF Document" in str_repr or "Document" in str_repr

    def test_document_repr_representation(self):
        """Test document repr representation includes metadata and transactions."""
        pdf_data = create_test_pdf()
        doc = DocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))
        doc.metadata = self.create_test_metadata()
        doc.transactions = [self.create_test_transaction(), self.create_test_transaction()]

        repr_str = repr(doc)
        assert "DocumentD" in repr_str
        assert "metadata=" in repr_str
        assert "transactions=[2 transactions]" in repr_str

    def test_document_to_dict_full(self):
        """Test document serialization with all data."""
        pdf_data = create_test_pdf()
        doc = DocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))
        doc.metadata = self.create_test_metadata()
        doc.transactions = [self.create_test_transaction()]

        result = doc.to_dict(include_pages=True, include_metadata=True, include_transactions=True)

        assert "file_binary_b64" in result
        assert result["as_of_date"] == "2024-01-15"
        assert "metadata" in result
        assert "transactions" in result
        assert "pages" in result
        assert len(result["transactions"]) == 1

    def test_document_to_dict_minimal(self):
        """Test document serialization with minimal data."""
        pdf_data = create_test_pdf()
        doc = DocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))
        doc.metadata = self.create_test_metadata()
        doc.transactions = [self.create_test_transaction()]

        result = doc.to_dict(
            include_pages=False, include_metadata=False, include_transactions=False
        )

        assert "file_binary_b64" in result
        assert result["as_of_date"] == "2024-01-15"
        assert "metadata" not in result
        assert "transactions" not in result
        assert "pages" not in result

    def test_document_from_dict(self):
        """Test document deserialization from dict."""
        pdf_data = create_test_pdf()
        original = DocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))
        original.metadata = self.create_test_metadata()
        original.transactions = [self.create_test_transaction()]

        # Round trip
        data = original.to_dict(
            include_pages=True, include_metadata=True, include_transactions=True
        )
        restored = DocumentD.from_dict(data)

        assert restored.file_binary == original.file_binary
        assert restored.as_of_date == original.as_of_date
        assert restored.document_id == original.document_id

        # Note: The from_dict method exists but may not fully restore
        # the metadata and transactions depending on implementation

    def test_document_with_empty_transactions(self):
        """Test document with empty transaction list."""
        pdf_data = create_test_pdf()
        doc = DocumentD(file_binary=pdf_data, as_of_date=dt.date(2024, 1, 15))
        doc.metadata = self.create_test_metadata()
        doc.transactions = []

        assert len(doc.transactions) == 0

        repr_str = repr(doc)
        assert "transactions=[0 transactions]" in repr_str
