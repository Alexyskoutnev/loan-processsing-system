from collections.abc import Callable
import dataclasses
import logging
from pathlib import Path
import time
from typing import Any

import falcon

from api.resources.documents import DocumentsResource
from api.resources.insights import InsightsResource
from storage.document_dao import InMemDAO


@dataclasses.dataclass(frozen=True)
class ApiRouter:
    document_dao: InMemDAO
    documents_file: Path

    def _process_request(
        self,
        req: falcon.Request,
        resp: falcon.Response,
        process_func: Callable[[falcon.Request], dict[str, Any]],
    ):
        """Process request with error handling and logging."""
        start_time = time.time()
        func_name = process_func.__qualname__

        try:
            logging.info(f"Received request ({func_name})")
            response_data = process_func(req)
            resp.status = falcon.HTTP_200
            resp.media = response_data

        except falcon.HTTPError:
            # Re-raise falcon HTTP errors
            raise
        except Exception as e:
            logging.exception(f"Error processing request ({func_name}): {e}")
            resp.status = falcon.HTTP_500
            resp.media = {"error": str(e)}
            raise

        finally:
            processing_time = time.time() - start_time
            logging.info(f"Processed request ({func_name}) in {processing_time:.2f} seconds")

    def on_post_documents(self, req: falcon.Request, resp: falcon.Response):
        self._process_request(req, resp, self._on_post_documents)

    def on_get_documents(self, req: falcon.Request, resp: falcon.Response):
        self._process_request(req, resp, self._on_get_documents)

    def on_get_document_details(self, req: falcon.Request, resp: falcon.Response, document_id: str):
        self._process_request(
            req, resp, lambda req: self._on_get_document_details(req, document_id)
        )

    def on_get_document_transactions(
        self, req: falcon.Request, resp: falcon.Response, document_id: str
    ):
        self._process_request(
            req, resp, lambda req: self._on_get_document_transactions(req, document_id)
        )

    def on_get_transactions(self, req: falcon.Request, resp: falcon.Response):
        self._process_request(req, resp, self._on_get_transactions)

    def on_get_insights(self, req: falcon.Request, resp: falcon.Response, document_id: str):
        self._process_request(req, resp, lambda req: self._on_get_insights(req, document_id))

    def on_get_insights_bulk(self, req: falcon.Request, resp: falcon.Response):
        self._process_request(req, resp, self._on_get_insights_bulk)

    def on_get_health(self, req: falcon.Request, resp: falcon.Response):
        self._process_request(req, resp, self._on_get_health)

    def _on_post_documents(self, req: falcon.Request) -> dict[str, Any]:
        return DocumentsResource.upload_and_process_document(
            req, self.document_dao, self.documents_file
        )

    def _on_get_documents(self, req: falcon.Request) -> dict[str, Any]:
        return DocumentsResource.get_all_documents(self.document_dao)

    def _on_get_document_details(self, req: falcon.Request, document_id: str) -> dict[str, Any]:
        return DocumentsResource.get_document_details(document_id, self.document_dao)

    def _on_get_document_transactions(
        self, req: falcon.Request, document_id: str
    ) -> dict[str, Any]:
        return DocumentsResource.get_document_transactions(document_id, self.document_dao)

    def _on_get_transactions(self, req: falcon.Request) -> dict[str, Any]:
        ids_param = req.get_param("ids")
        if not ids_param:
            raise falcon.HTTPBadRequest(description="Missing 'ids' query parameter")
        ids = [i.strip() for i in ids_param.split(",") if i.strip()]
        if not ids:
            raise falcon.HTTPBadRequest(description="No valid ids provided")
        return DocumentsResource.get_transactions_bulk(ids, self.document_dao)

    def _on_get_insights(self, req: falcon.Request, document_id: str) -> dict[str, Any]:
        return InsightsResource.get_document_underwriting_insights(document_id, self.document_dao)

    def _on_get_insights_bulk(self, req: falcon.Request) -> dict[str, Any]:
        ids_param = req.get_param("ids")
        if not ids_param:
            raise falcon.HTTPBadRequest(description="Missing 'ids' query parameter")
        ids = [i.strip() for i in ids_param.split(",") if i.strip()]
        if not ids:
            raise falcon.HTTPBadRequest(description="No valid ids provided")
        return InsightsResource.get_bulk_underwriting_insights(ids, self.document_dao)

    def _on_get_health(self, req: falcon.Request) -> dict[str, str]:
        return {"status": "ok", "message": "API is healthy"}
