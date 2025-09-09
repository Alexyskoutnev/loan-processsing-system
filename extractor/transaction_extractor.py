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
    "Be thorough - capture every transaction shown in the statement. "
    "Return ONLY a JSON array that conforms to the provided JSON schema."
)


class TransactionExtractor(BaseExtractor[RawDocumentD, list[TransactionD]]):
    # Using the same model as StatementMetadataExtractor for consistency
    llm_model: ClassVar[str] = "openai/gpt-5"

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
                    "For each transaction, extract:\n"
                    " - document_id (use the document ID provided above)\n"
                    " - transaction_date (YYYY-MM-DD format)\n"
                    " - transaction_amount (positive decimal string, e.g., '123.45')\n"
                    " - transaction_description (the merchant/payee/description text)\n"
                    " - transaction_type ('debit' for charges/outflows, 'credit' for deposits/inflows)\n"
                    "\n"
                    "Important:\n"
                    " - Include ALL transactions visible in the statement\n"
                    " - Amounts should always be positive (type indicates debit/credit)\n"
                    " - Use exact dates from the statement\n"
                    " - Preserve the original description text\n"
                    " - Return an empty array [] if no transactions are found\n"
                ),
            }
        ]

        user_parts.extend(to_responses_input_parts(element))

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
                        "schema": TransactionD.json_schema_array(),
                        "strict": True,
                    },
                },
            ),
        )

        raw = response["choices"][0]["message"]["content"]
        try:
            data_list = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"Model did not return valid JSON: {e}\nRaw: {raw!r}") from e

        transactions: list[TransactionD] = []
        for idx, txn_data in enumerate(data_list):
            try:
                txn_data["document_id"] = element.document_id
                transaction = TransactionD.from_dict(txn_data)
                transactions.append(transaction)
            except Exception as e:
                # We raise an error if any transaction fails to parse
                raise ValueError(
                    f"Failed to construct TransactionD at index {idx} from data: {txn_data}"
                ) from e

        logging.info(
            f"Extracted {len(transactions)} transactions from document {element.document_id}"
        )
        return transactions
