from __future__ import annotations

from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from typing import Any, ClassVar, cast

import litellm

from domain.document_d import PageD, RawDocumentD
from domain.statement_d import TransactionD
from extractor.base_extractor import BaseExtractor
from utils.converters import to_responses_input_parts
from utils.json_fns import safe_json_loads

TRANSACTION_SYSTEM_PROMPT: str = (
    "You are a precise financial document parser specialized in extracting transactions. "
    "Extract ALL transactions from the provided bank statement page. "
    "Each transaction should include: date (ISO format YYYY-MM-DD), amount (as string decimal), "
    "description, and type (debit for outflows/charges, credit for inflows/deposits). "
    "Return ONLY a JSON object with a 'transactions' array that conforms to the provided JSON schema."
)


class TransactionExtractor(BaseExtractor[RawDocumentD, list[TransactionD]]):
    # llm_model: ClassVar[str] = "openai/gpt-5"
    llm_model: ClassVar[str] = "openai/gpt-5"

    # Threading knobs
    _MAX_WORKERS: ClassVar[int] = 16

    def _process(self, element: RawDocumentD) -> list[TransactionD]:
        pages = list(self._break_into_pages(element))
        if not pages:
            logging.info("No pages found")
            return []

        if len(pages) == 1:
            # trivial fast path (no threadpool overhead)
            return self._extract_from_page(element, pages[0])

        logging.info(
            f"Processing {len(pages)} pages in parallel for document {element.document_id}"
        )

        all_txns: list[TransactionD] = []
        with ThreadPoolExecutor(max_workers=self._MAX_WORKERS) as ex:
            futures = {
                ex.submit(self._extract_from_page, element, page): page.page_number
                for page in pages
            }

            for fut in as_completed(futures):
                page_no = futures[fut]
                try:
                    page_txns = fut.result()
                    all_txns.extend(page_txns)
                    logging.info(
                        f"[doc={element.document_id}] page {page_no}: +{len(page_txns)} txns"
                    )
                except Exception as e:
                    logging.exception(
                        f"[doc={element.document_id}] page {page_no}: extraction failed: {e}"
                    )

        logging.info(f"Total extracted: {len(all_txns)} transactions")
        return all_txns

    def _extract_from_page(self, document: RawDocumentD, page: PageD) -> list[TransactionD]:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": TRANSACTION_SYSTEM_PROMPT},
        ]

        user_parts: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": (
                    "Extract ALL transactions from this bank statement page.\n"
                    f"Document ID: {document.document_id}\n"
                    f"Page Number: {page.page_number}\n\n"
                    "Return a JSON object with a 'transactions' array.\n"
                    "Each transaction must include:\n"
                    " - document_id (use the document ID provided above)\n"
                    " - transaction_date (YYYY-MM-DD format)\n"
                    " - transaction_amount (positive decimal string)\n"
                    " - transaction_description (original text)\n"
                    " - transaction_type ('debit' or 'credit')\n"
                ),
            }
        ]
        user_parts.extend(to_responses_input_parts(doc=page))
        messages.append({"role": "user", "content": user_parts})

        response = cast(
            dict[str, Any],
            litellm.completion(  # type: ignore
                model=self.llm_model,
                messages=messages,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "TransactionList",
                        "schema": TransactionD.json_schema_wrapped_array(),
                        "strict": True,
                    },
                },
            ),
        )

        raw = response["choices"][0]["message"]["content"]
        data = safe_json_loads(raw)

        txns: list[TransactionD] = []
        for idx, txn_data in enumerate(data.get("transactions", [])):
            try:
                txn_data["document_id"] = document.document_id
                txns.append(TransactionD.from_dict(txn_data))
            except Exception as e:
                logging.error(
                    f"[doc={document.document_id}] page {page.page_number}, txn {idx}: {e}"
                )
        return txns

    def _break_into_pages(self, element: RawDocumentD) -> Iterator[PageD]:
        yield from element.create_pages()
