from __future__ import annotations

import datetime as dt
import logging
from pathlib import Path

from domain.document_d import DocumentD, RawDocumentD
from domain.statement_d import StatementMetaDataD, TransactionD
from extractor.statement_metadata_extractor import StatementMetadataExtractor
from extractor.transaction_categorization_extractor import TransactionCategorizationExtractor
from extractor.transaction_extractor import TransactionExtractor
from services.reconciliation_service import StatementReconciliationService
from storage.document_dao import InMemDAO


def _load_pdf_file(pdf_file: Path) -> bytes:
    with open(pdf_file, "rb") as f:
        return f.read()


def _create_raw_document_from_binary(file_binary: bytes, filename: str) -> RawDocumentD:
    return RawDocumentD(file_binary=file_binary, as_of_date=dt.date.today())


def _extract_statement_data(
    raw_document: RawDocumentD,
) -> tuple[StatementMetaDataD | None, list[TransactionD] | None]:
    metadata_extractor = StatementMetadataExtractor()
    transaction_extractor = TransactionExtractor()

    metadata = metadata_extractor.process(raw_document)
    transactions = transaction_extractor.process(raw_document)

    return metadata, transactions


def _categorize_transactions(transactions: list[TransactionD]) -> list[TransactionD]:
    if not transactions:
        return transactions

    categorization_extractor = TransactionCategorizationExtractor()
    return categorization_extractor.process(transactions)


def _link_to_document(
    metadata: StatementMetaDataD | None, transactions: list[TransactionD] | None, document_id: str
) -> None:
    """Link extracted data to the document ID."""
    if metadata:
        metadata.document_id = document_id
    if transactions:
        for txn in transactions:
            txn.document_id = document_id


def _create_document(
    raw_document: RawDocumentD,
    metadata: StatementMetaDataD | None,
    transactions: list[TransactionD] | None,
) -> DocumentD:
    """Create the final document with all extracted data."""
    # Create document by copying from raw document
    document = DocumentD(
        file_binary=raw_document.file_binary,
        as_of_date=raw_document.as_of_date,
        document_id=raw_document.document_id,
    )

    # Copy pages from raw document to avoid re-processing
    document.pages = raw_document.pages

    # Set extracted data
    document.metadata = metadata  # type: ignore[assignment]
    document.transactions = transactions or []

    return document


def _reconcile_statement(document: DocumentD):
    if not (document.metadata and document.transactions):
        return
    if StatementReconciliationService.reconcile(document):
        logging.info("✓ Document balanced")
    else:
        logging.warning("✗ Document NOT balanced")


def _log_processing_results(filename: str, transactions: list[TransactionD]):
    transaction_count = len(transactions) if transactions else 0
    categorized_count = sum(1 for t in transactions if t.category and t.category.value != "error")
    error_count = sum(1 for t in transactions if t.category and t.category.value == "error")

    if transactions:
        logging.debug(f"Extracted table for {filename}:\n{TransactionD.table_str(transactions)}")

    # Log summary with error details
    logging.info(
        f"Stored {transaction_count} transactions ({categorized_count} categorized, {error_count} errors)"
    )

    # Log specific error details if any
    if error_count > 0:
        error_transactions = [t for t in transactions if t.category and t.category.value == "error"]
        logging.warning(f"Found {error_count} categorization errors in {filename}:")
        for i, txn in enumerate(error_transactions[:5], 1):  # Log first 5 errors
            logging.warning(f"  Error {i}: {txn.transaction_description}...")
        if len(error_transactions) > 5:
            logging.warning(f"  ... and {len(error_transactions) - 5} more errors")


def _process_empty_document(
    filename: str, raw_document: RawDocumentD, doc_dao: InMemDAO
) -> DocumentD:
    "Case where there is no valid statement data extracted."
    logging.warning(f"No transactions extracted from {filename} - creating empty document")
    empty_transactions: list[TransactionD] = []
    document = _create_document(raw_document, None, empty_transactions)
    # Do we insert empty documents? For now, yes.
    doc_dao.insert(document)
    _log_processing_results(filename, empty_transactions)
    return document


def _process_valid_statement(
    filename: str,
    raw_document: RawDocumentD,
    metadata: StatementMetaDataD,
    transactions: list[TransactionD],
    doc_dao: InMemDAO,
) -> DocumentD:
    """Handle case where valid statement data was extracted."""
    # Ensure document_id is not None
    document_id = raw_document.document_id
    if document_id is None:
        raise ValueError("Document ID cannot be None")

    # Process the statement data
    categorized_transactions = _categorize_transactions(transactions)
    _link_to_document(metadata, categorized_transactions, document_id)
    document = _create_document(raw_document, metadata, categorized_transactions)

    # Reconcile and store
    _reconcile_statement(document)
    doc_dao.insert(document)
    _log_processing_results(filename, categorized_transactions)

    return document


#### Main processing functions ####
def process_statement_from_binary(
    file_binary: bytes, filename: str, doc_dao: InMemDAO
) -> DocumentD:
    """Process bank statement from binary PDF data."""
    logging.info(f"Processing {filename} ({len(file_binary)} bytes)")

    # Create raw document from binary data
    raw_document = _create_raw_document_from_binary(file_binary, filename)

    # Extract base metadata and transactions
    metadata, transactions = _extract_statement_data(raw_document)

    # Route processing based on what data was successfully extracted
    match (metadata, transactions):
        case (None, _) | (_, None) | (_, []):
            # Case 1: Missing critical data - treat as non-statement document
            return _process_empty_document(filename, raw_document, doc_dao)

        case (metadata, transactions) if metadata and transactions:
            # Case 2: Complete statement data - full processing pipeline
            return _process_valid_statement(filename, raw_document, metadata, transactions, doc_dao)

        case _:
            # Case 3: Defensive fallback for unexpected data combinations
            logging.warning(
                f"Unexpected extraction result for {filename}: metadata={type(metadata)}, transactions={type(transactions)}"
            )
            return _process_empty_document(filename, raw_document, doc_dao)


def process_statement(pdf_file: Path, doc_dao: InMemDAO) -> DocumentD:
    logging.info(f"Processing {pdf_file.name}")

    # Load and create raw document
    file_binary = _load_pdf_file(pdf_file)
    raw_document = RawDocumentD(file_binary=file_binary, as_of_date=dt.date.today())

    # Extract base metadata and transactions
    metadata, transactions = _extract_statement_data(raw_document)

    # Route processing based on what data was successfully extracted
    # Cases handled:
    # 1. Empty: No metadata OR no transactions OR empty transaction list
    # 2. Valid: Both metadata and transactions present
    # 3. Fallback: Safety net for unexpected combinations
    match (metadata, transactions):
        case (None, _) | (_, None) | (_, []):
            # Case 1: Missing critical data - treat as non-statement document
            # Examples: image files, corrupted PDFs, non-financial documents
            return _process_empty_document(pdf_file.name, raw_document, doc_dao)

        case (metadata, transactions) if metadata and transactions:
            # Case 2: Complete statement data - full processing pipeline
            # Includes: categorization, reconciliation, validation
            return _process_valid_statement(
                pdf_file.name, raw_document, metadata, transactions, doc_dao
            )

        case _:
            # Case 3: Defensive fallback for unexpected data combinations
            # Should rarely occur but ensures system stability
            logging.warning(
                f"Unexpected extraction result for {pdf_file.name}: metadata={type(metadata)}, transactions={type(transactions)}"
            )
            return _process_empty_document(pdf_file.name, raw_document, doc_dao)


def process_all_statements(data_folder: Path, dao: InMemDAO):
    pdf_files = list(data_folder.glob("*.pdf"))

    if not pdf_files:
        logging.warning(f"No PDF files found in {data_folder}")
        return

    logging.info(f"Found {len(pdf_files)} PDF files")

    for pdf_file in pdf_files:
        # try:
        process_statement(pdf_file, dao)
        # except Exception as e:
        # logging.error(f"Failed to process {pdf_file.name}: {e}")
        # Continue with next file

    # save all documents after processing
    dao.save(Path("bin/documents.json"))


def run():
    dao = InMemDAO()
    data_folder = Path("data")
    process_all_statements(data_folder, dao)
    # save result to file
    dao.save(Path("bin/documents.json"))


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    run()


if __name__ == "__main__":
    main()
