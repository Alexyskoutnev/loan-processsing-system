from __future__ import annotations

import json
import logging
from typing import Any, ClassVar, cast

import litellm

from domain.document_d import RawDocumentD
from domain.statement_d import TransactionD
from extractor.base_extractor import BaseExtractor
from utils.converters import to_responses_input_parts

TRANSACTION_SYSTEM_PROMPT: str = (
    "You are a precise financial document parser specialized in extracting transactions. "
    "Extract ALL transactions from the provided bank statement(s). "
    "Each transaction should include: date (ISO format YYYY-MM-DD), amount (as string decimal), "
    "description, and type (debit for outflows/charges, credit for inflows/deposits). "
    "Return ONLY a JSON object with a 'transactions' array that conforms to the provided JSON schema."
)


class TransactionExtractor(BaseExtractor[RawDocumentD, list[TransactionD]]):
    llm_model: ClassVar[str] = "openai/gpt-4o"

    def _process(self, element: RawDocumentD) -> list[TransactionD]:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": TRANSACTION_SYSTEM_PROMPT},
        ]

        user_parts: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": (
                    "Task: Extract ALL transactions from the bank statement.\n"
                    f"Document ID: {element.document_id}\n"
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

        # Attach the document
        user_parts.extend(to_responses_input_parts(element))
        messages.append({"role": "user", "content": user_parts})

        # Use the new wrapped schema method
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
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"Model did not return valid JSON: {e}") from e

        # Extract transactions from wrapper
        if not isinstance(data, dict) or "transactions" not in data:
            raise ValueError("Expected JSON object with 'transactions' key")

        transactions: list[TransactionD] = []
        for idx, txn_data in enumerate(data["transactions"]):  # type: ignore
            try:
                txn_data["document_id"] = element.document_id
                transactions.append(TransactionD.from_dict(txn_data))  # type: ignore
            except Exception as e:
                raise ValueError(f"Failed to parse transaction {idx}: {e}") from e

        logging.info(f"Extracted {len(transactions)} transactions")
        return transactions
