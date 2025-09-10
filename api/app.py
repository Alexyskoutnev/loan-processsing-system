import json
import logging
from pathlib import Path

import falcon

from api.api_router import ApiRouter
from storage.document_dao import InMemDAO

LOG_FILE = Path("bin/logs/api.log")
if not LOG_FILE.parent.exists():
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


def _load_dao(dao: InMemDAO, documents_file: Path) -> None:
    if documents_file.exists():
        # check if its values are valid json
        valid_json = False
        try:
            with open(documents_file) as f:
                json.load(f)
                valid_json = True
        except json.JSONDecodeError as e:
            logging.warning(f"Invalid JSON in {documents_file}: {e}")
        if valid_json:
            logging.info(f"Loading documents from {documents_file}")
            try:
                dao.load(documents_file)
                logging.info(f"Loaded {len(dao.read_all())} existing documents")
            except Exception as e:
                logging.warning(f"Failed to load documents: {e}")


def create_app() -> falcon.App:
    # file handler and stdout handlers to root logger
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()],
    )
    logging.info("Starting Bank Processing API")

    app = falcon.App(
        middleware=[
            falcon.CORSMiddleware(allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"])
        ]
    )

    dao = InMemDAO()
    documents_file = Path("bin/documents.json")

    _load_dao(dao, documents_file)

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
