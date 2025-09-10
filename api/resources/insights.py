import logging

import falcon

from services.underwriting_metrics_service_v2 import UnderwritingMetricsService
from storage.document_dao import InMemDAO, NotFound


class InsightsResource:
    @classmethod
    def get_document_underwriting_insights(cls, document_id: str, dao: InMemDAO) -> dict:
        """Get underwriting insights for a specific document."""

        try:
            document = dao.read(document_id)
        except (NotFound, ValueError) as e:
            raise falcon.HTTPNotFound(description=f"Document {document_id} not found") from e

        if not document.transactions:
            return {
                "success": True,
                "document_id": document_id,
                "message": "No transactions found in this document",
                "insights": None,
            }

        try:
            # Calculate underwriting metrics for this document only
            logging.info(
                f"Calculating metrics for document {document_id} with {len(document.transactions)} transactions"
            )

            metrics = UnderwritingMetricsService.calculate_metrics(document.transactions)

            return {
                "success": True,
                "document_id": document_id,
                "transaction_count": len(document.transactions),
                "document_metadata": cls._document_metadata(document),
                "insights": cls._metrics_to_dict(metrics),
            }

        except Exception as e:
            logging.error(f"Error calculating insights for document {document_id}: {e}")
            raise falcon.HTTPInternalServerError(
                description=f"Failed to calculate insights: {e!s}"
            ) from e

    @classmethod
    def get_bulk_underwriting_insights(cls, ids: list[str], dao: InMemDAO) -> dict:
        """Get underwriting insights for multiple documents in one call.

        Response shape:
        {
          "success": true,
          "results": [
            {
              "document_id": "...",
              "success": true,
              "transaction_count": 123,
              "document_metadata": {...},
              "insights": {...}  # includes bucket_breakdown
            },
            { "document_id": "...", "success": false, "error": "..." }
          ]
        }
        """
        results: list[dict] = []

        for doc_id in ids:
            try:
                document = dao.read(doc_id)
            except ValueError:
                results.append(
                    {
                        "document_id": doc_id,
                        "success": False,
                        "error": f"Document {doc_id} not found",
                    }
                )
                continue

            if not document.transactions:
                results.append(
                    {
                        "document_id": doc_id,
                        "success": True,
                        "transaction_count": 0,
                        "document_metadata": cls._document_metadata(document),
                        "insights": None,
                    }
                )
                continue

            try:
                metrics = UnderwritingMetricsService.calculate_metrics(document.transactions)
                results.append(
                    {
                        "document_id": doc_id,
                        "success": True,
                        "transaction_count": len(document.transactions),
                        "document_metadata": cls._document_metadata(document),
                        "insights": cls._metrics_to_dict(metrics),
                    }
                )
            except Exception as e:
                logging.error(f"Error calculating insights for document {doc_id}: {e}")
                results.append(
                    {
                        "document_id": doc_id,
                        "success": False,
                        "error": f"Failed to calculate insights: {e!s}",
                    }
                )

        return {"success": True, "results": results}

    @classmethod
    def _metrics_to_dict(cls, metrics) -> dict:
        """Convert metrics object to dictionary."""
        result = {}

        # Extract key metrics attributes
        for attr in dir(metrics):
            if not attr.startswith("_") and not callable(getattr(metrics, attr)):
                value = getattr(metrics, attr)

                # Handle different value types
                if hasattr(value, "__dict__"):
                    # Nested object - recursively convert
                    result[attr] = cls._object_to_dict(value)
                elif hasattr(value, "__iter__") and not isinstance(value, (str, bytes)):
                    # Iterable (list, tuple) - convert elements
                    result[attr] = [
                        cls._object_to_dict(item) if hasattr(item, "__dict__") else str(item)
                        for item in value
                    ]
                else:
                    # Simple value - convert Decimal to string
                    result[attr] = (
                        str(value)
                        if hasattr(value, "__class__") and "Decimal" in str(value.__class__)
                        else value
                    )

        return result

    @classmethod
    def _document_metadata(cls, document) -> dict:
        """Extract document metadata for response."""
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
    def _object_to_dict(cls, obj) -> dict:
        """Convert any object to dictionary format."""
        if obj is None:
            return None

        result = {}
        for attr in dir(obj):
            if not attr.startswith("_") and not callable(getattr(obj, attr)):
                value = getattr(obj, attr)
                if hasattr(value, "__class__") and "Decimal" in str(value.__class__):
                    result[attr] = str(value)
                elif hasattr(value, "__dict__"):
                    result[attr] = cls._object_to_dict(value)
                else:
                    result[attr] = value
        return result
