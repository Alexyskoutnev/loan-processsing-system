import base64
import logging
from pathlib import Path
from typing import Any

import falcon

from pipeline.pipeline import process_statement_from_binary
from storage.document_dao import InMemDAO


class DocumentsResource:
    @classmethod
    def get_all_documents(cls, dao: InMemDAO) -> dict[str, Any]:
        try:
            documents = dao.read_all()

            documents_list = []
            for doc in documents:
                doc_summary = {
                    "document_id": doc.document_id,
                    "filename": f"document_{doc.document_id[:8]}.pdf",
                    "upload_date": doc.as_of_date.isoformat(),
                    "has_metadata": doc.metadata is not None,
                    "transaction_count": len(doc.transactions) if doc.transactions else 0,
                    "page_count": len(doc.pages),
                }

                if doc.metadata:
                    doc_summary.update(
                        {
                            "statement_name": f"{doc.metadata.bank_name} - {doc.metadata.account_holder_name}",
                            "opening_balance": str(doc.metadata.statement_opening_balance)
                            if doc.metadata.statement_opening_balance
                            else None,
                            "closing_balance": str(doc.metadata.statement_closing_balance)
                            if doc.metadata.statement_closing_balance
                            else None,
                        }
                    )

                documents_list.append(doc_summary)

            return {
                "success": True,
                "documents": documents_list,
                "total_count": len(documents_list),
            }

        except Exception as e:
            logging.error(f"Error fetching documents: {e}")
            raise falcon.HTTPInternalServerError(
                description=f"Failed to fetch documents: {e!s}"
            ) from e

    @classmethod
    def get_document_details(cls, document_id: str, dao: InMemDAO) -> dict[str, Any]:
        try:
            document = dao.read(document_id)
        except ValueError as e:
            raise falcon.HTTPNotFound(description=f"Document {document_id} not found") from e

        try:
            return {
                "success": True,
                "document_id": document_id,
                "filename": f"document_{document_id[:8]}.pdf",
                "upload_date": document.as_of_date.isoformat(),
                "has_metadata": document.metadata is not None,
                "transaction_count": len(document.transactions) if document.transactions else 0,
                "page_count": len(document.pages),
                "binary_data": base64.b64encode(document.file_binary).decode("utf-8"),
                "mime_type": "application/pdf",
                "pages": [
                    {
                        "page_number": page.page_number,
                        "binary_data": base64.b64encode(page.file_binary).decode("utf-8"),
                        "has_text": page.text is not None,
                    }
                    for page in document.pages
                ],
                "metadata": cls._get_metadata_summary(document) if document.metadata else None,
            }

        except Exception as e:
            logging.error(f"Error getting document details for {document_id}: {e}")
            raise falcon.HTTPInternalServerError(
                description=f"Failed to get document details: {e!s}"
            ) from e

    @classmethod
    def get_document_transactions(cls, document_id: str, dao: InMemDAO) -> dict[str, Any]:
        """Return all transactions for a given document as JSON-serializable dicts."""
        try:
            document = dao.read(document_id)
        except ValueError as e:
            raise falcon.HTTPNotFound(description=f"Document {document_id} not found") from e

        try:
            transactions = []
            if document.transactions:
                for t in document.transactions:
                    # Domain object has to_dict returning strings for Decimal and ISO dates
                    td = t.to_dict()
                    td["document_id"] = document_id
                    transactions.append(td)

            return {
                "success": True,
                "document_id": document_id,
                "transaction_count": len(transactions),
                "transactions": transactions,
            }
        except Exception as e:
            logging.error(f"Error getting transactions for {document_id}: {e}")
            raise falcon.HTTPInternalServerError(
                description=f"Failed to get transactions: {e!s}"
            ) from e

    @classmethod
    def get_transactions_bulk(cls, ids: list[str], dao: InMemDAO) -> dict[str, Any]:
        """Return combined transactions for multiple document IDs."""
        combined: list[dict[str, Any]] = []
        not_found: list[str] = []
        for doc_id in ids:
            try:
                document = dao.read(doc_id)
            except ValueError:
                not_found.append(doc_id)
                continue
            if document.transactions:
                for t in document.transactions:
                    td = t.to_dict()
                    td["document_id"] = doc_id
                    combined.append(td)

        return {
            "success": True,
            "requested_count": len(ids),
            "missing": not_found,
            "total_transactions": len(combined),
            "transactions": combined,
        }

    @classmethod
    def _get_metadata_summary(cls, document) -> dict[str, Any] | None:
        if not document.metadata:
            return None

        return {
            "statement_name": f"{document.metadata.bank_name} - {document.metadata.account_holder_name}",
            "period_start": document.metadata.statement_start_date.isoformat()
            if document.metadata.statement_start_date
            else None,
            "period_end": document.metadata.statement_end_date.isoformat()
            if document.metadata.statement_end_date
            else None,
            "opening_balance": str(document.metadata.statement_opening_balance)
            if document.metadata.statement_opening_balance
            else None,
            "closing_balance": str(document.metadata.statement_closing_balance)
            if document.metadata.statement_closing_balance
            else None,
            "bank_name": document.metadata.bank_name,
            "account_holder_name": document.metadata.account_holder_name,
            "account_number": document.metadata.account_number,
        }

    @classmethod
    def upload_and_process_document(
        cls, req: falcon.Request, dao: InMemDAO, documents_file: Path
    ) -> dict[str, Any]:
        try:
            data = req.media
            if not data:
                raise falcon.HTTPBadRequest(description="No JSON data provided")

            if "file_data" not in data or "filename" not in data:
                raise falcon.HTTPBadRequest(description="Missing file_data or filename in JSON")

            filename = data["filename"]
            if not filename.lower().endswith(".pdf"):
                raise falcon.HTTPBadRequest(description="Only PDF files are allowed")

            file_binary = base64.b64decode(data["file_data"])

            if not file_binary:
                raise falcon.HTTPBadRequest(description="Empty file provided")

            if len(file_binary) > 50 * 1024 * 1024:  # 50MB limit
                raise falcon.HTTPBadRequest(description="File too large (max 50MB)")

            logging.info(f"Processing uploaded document: {filename} ({len(file_binary)} bytes)")

            process_statement_from_binary(file_binary, filename, dao)

            dao.save(documents_file)

            return {
                "success": True,
                "message": f"Document {filename} processed successfully",
            }

        except Exception as e:
            logging.error(f"Error processing document: {e}")
            raise falcon.HTTPInternalServerError(
                description=f"Failed to process document: {e!s}"
            ) from e
