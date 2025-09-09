from __future__ import annotations

import datetime as dt
import logging
from pathlib import Path

from domain.document_d import DocumentD, RawDocumentD
from domain.statement_d import TransactionD
from extractor.statement_metadata_extractor import StatementMetadataExtractor
from extractor.transaction_extractor import TransactionExtractor
from services.reconciliation_service import StatementReconciliationService
from storage.document_dao import InMemDAO


def process_statement(pdf_file: Path, doc_dao: InMemDAO) -> DocumentD:
    logging.info(f"Processing {pdf_file.name}")

    with open(pdf_file, "rb") as f:
        file_binary = f.read()

    raw_document = RawDocumentD(file_binary=file_binary, as_of_date=dt.date.today())

    metadata_extractor = StatementMetadataExtractor()
    transaction_extractor = TransactionExtractor()
    metadata = metadata_extractor.process(raw_document)
    transactions = transaction_extractor.process(raw_document)
    logging.info(f"Extracted table for {pdf_file.name}:\n{TransactionD.table_str(transactions)}")
    if metadata:
        metadata.document_id = raw_document.document_id  # type: ignore
    if transactions:
        for txn in transactions:
            txn.document_id = raw_document.document_id  # type: ignore

    document = DocumentD(
        file_binary=raw_document.file_binary,
        as_of_date=raw_document.as_of_date,
        document_id=raw_document.document_id,
    )
    document.metadata = metadata
    document.transactions = transactions or []

    # statement reconciliation -> verify it aligns with transactions and the starting/ending balances
    if metadata and transactions:
        if StatementReconciliationService.reconcile(document):
            logging.info("✓ Document balanced")
        else:
            logging.warning("✗ Document NOT balanced")

    doc_dao.insert(document)

    logging.info(f"Stored {len(transactions or [])} transactions")

    return document


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

    if not data_folder.exists():
        logging.error(f"Data folder {data_folder} does not exist")
        return

    process_all_statements(data_folder, dao)

    documents = dao.list_documents()
    total_transactions = sum(len(doc.transactions) for doc in documents)

    logging.info(f"\n{'=' * 40}")
    logging.info(f"Processed {len(documents)} documents")
    logging.info(f"Total transactions: {total_transactions}")


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    run()


if __name__ == "__main__":
    main()
