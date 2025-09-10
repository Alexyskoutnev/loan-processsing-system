import logging
from pathlib import Path

import falcon

from api.api_router import ApiRouter
from storage.document_dao import InMemDAO


def create_app() -> falcon.App:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    logging.info("Starting Bank Processing API")

    app = falcon.App(
        middleware=[
            falcon.CORSMiddleware(allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"])
        ]
    )

    dao = InMemDAO()
    documents_file = Path("bin/documents.json")

    if documents_file.exists():
        try:
            dao.load(documents_file)
            logging.info(f"Loaded {len(dao.read_all())} existing documents")
        except Exception as e:
            logging.warning(f"Failed to load documents: {e}")

    api_router = ApiRouter(document_dao=dao, documents_file=documents_file)

    app.add_route("/documents", api_router, suffix="documents")
    app.add_route("/documents/{document_id}", api_router, suffix="document_details")
    app.add_route(
        "/documents/{document_id}/transactions", api_router, suffix="document_transactions"
    )
    app.add_route("/transactions", api_router, suffix="transactions")
    app.add_route("/insights/{document_id}", api_router, suffix="insights")
    app.add_route("/insights", api_router, suffix="insights_bulk")
    app.add_route("/health", api_router, suffix="health")

    logging.info("App created successfully")
    return app
