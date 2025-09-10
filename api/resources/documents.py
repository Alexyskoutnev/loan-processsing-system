import base64
import logging
from pathlib import Path

import falcon

from pipeline.pipeline import process_statement_from_binary
from storage.document_dao import InMemDAO


class DocumentsResource:
    @classmethod
    def upload_and_process_document(
        cls, req: falcon.Request, dao: InMemDAO, documents_file: Path
    ) -> dict:
        """Upload PDF and process it through the pipeline."""

        try:
            # Expect JSON with base64 encoded file
            data = req.media
            if not data:
                raise falcon.HTTPBadRequest(description="No JSON data provided")

            if "file_data" not in data or "filename" not in data:
                raise falcon.HTTPBadRequest(description="Missing file_data or filename in JSON")

            filename = data["filename"]
            if not filename.lower().endswith(".pdf"):
                raise falcon.HTTPBadRequest(description="Only PDF files are allowed")

            # Decode base64 file data
            file_binary = base64.b64decode(data["file_data"])

            if not file_binary:
                raise falcon.HTTPBadRequest(description="Empty file provided")

            if len(file_binary) > 50 * 1024 * 1024:  # 50MB limit
                raise falcon.HTTPBadRequest(description="File too large (max 50MB)")

            logging.info(f"Processing uploaded document: {filename} ({len(file_binary)} bytes)")

            # Process binary data directly through pipeline
            document = process_statement_from_binary(file_binary, filename, dao)

            # Save to persistent storage
            dao.save(documents_file)

            return {
                "success": True,
                "message": f"Document {filename} processed successfully",
                "document": cls._document_to_summary(document),
            }

        except Exception as e:
            logging.error(f"Error processing document {filename}: {e}")
            raise falcon.HTTPInternalServerError(
                description=f"Failed to process document: {e!s}"
            ) from e

    @classmethod
    def get_all_documents(cls, dao: InMemDAO) -> dict:
        """Get all processed documents."""
        documents = dao.read_all()

        return {
            "success": True,
            "count": len(documents),
            "documents": [cls._document_to_summary(doc) for doc in documents],
        }

    @classmethod
    def get_document_details(cls, document_id: str, dao: InMemDAO) -> dict:
        """Get detailed document information including transactions."""
        try:
            document = dao.read(document_id)
            if not document:
                raise falcon.HTTPNotFound(description=f"Document {document_id} not found")

            return {
                "success": True,
                "document": {
                    "document_id": document.document_id,
                    "statement_name": document.metadata.statement_name
                    if document.metadata
                    else None,
                    "opening_balance": str(document.metadata.statement_opening_balance)
                    if document.metadata and document.metadata.statement_opening_balance
                    else None,
                    "closing_balance": str(document.metadata.statement_closing_balance)
                    if document.metadata and document.metadata.statement_closing_balance
                    else None,
                    "transaction_count": len(document.transactions),
                    "transactions": [
                        cls._transaction_to_dict(txn) for txn in document.transactions
                    ],
                },
            }
        except Exception as e:
            logging.error(f"Error getting document details for {document_id}: {e}")
            raise falcon.HTTPInternalServerError(
                description=f"Failed to get document details: {e!s}"
            ) from e

    @classmethod
    def _transaction_to_dict(cls, transaction) -> dict:
        """Convert transaction to dictionary format."""
        return {
            "transaction_id": transaction.transaction_id,
            "date": transaction.transaction_date.isoformat()
            if transaction.transaction_date
            else None,
            "description": transaction.transaction_description,
            "amount": str(transaction.transaction_amount),
            "category": transaction.transaction_category.value
            if transaction.transaction_category
            else "other",
        }

    @classmethod
    def _document_to_summary(cls, document) -> dict:
        """Convert document to summary format."""
        return {
            "document_id": document.document_id,
            "transaction_count": len(document.transactions),
            "has_metadata": document.metadata is not None,
            "statement_name": document.metadata.statement_name if document.metadata else None,
            "opening_balance": str(document.metadata.statement_opening_balance)
            if document.metadata and document.metadata.statement_opening_balance
            else None,
            "closing_balance": str(document.metadata.statement_closing_balance)
            if document.metadata and document.metadata.statement_closing_balance
            else None,
        }
