from __future__ import annotations

import json
import logging
from typing import Any, ClassVar, cast

import litellm

from domain.document_d import DocumentD
from domain.statement_d import StatementMetaDataD
from extractor.base_extractor import BaseExtractor
from utils.converters import to_responses_input_parts

STATEMENT_SYSTEM_PROMPT: str = (
    "You are a precise financial document parser. "
    "Extract statement-level metadata from the provided bank statement(s). "
    "Use ISO dates (YYYY-MM-DD). If a field is missing/unclear, infer conservatively. "
    "Return ONLY a JSON object that conforms to the provided JSON schema."
)


class StatementMetadataExtractor(BaseExtractor[DocumentD, StatementMetaDataD]):
    # TODO: I want to make this a enum (easier to tab/manage) instead of a string
    llm_model: ClassVar[str] = "openai/gpt-5"

    def _process(self, element: DocumentD) -> StatementMetaDataD:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": STATEMENT_SYSTEM_PROMPT},
        ]

        user_parts: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": (
                    "Task: Extract bank statement metadata for the statement represented by the attached content.\n"
                    f"Primary document_id: {doc.document_id}\n"
                    "Fields to extract:\n"
                    " - document_id (should be the primary document_id above)\n"
                    " - bank_name\n"
                    " - account_holder_name\n"
                    " - account_number\n"
                    " - statement_start_date (YYYY-MM-DD)\n"
                    " - statement_end_date   (YYYY-MM-DD)\n"
                    " - statement_opening_balance (string decimal)\n"
                    " - statement_closing_balance (string decimal)\n"
                ),
            }
        ]

        # Attach the document(s) as a base64 data URL (for multimodal models) first.
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
                        "name": "StatementMetaDataD",
                        "schema": StatementMetaDataD.json_schema(),
                        "strict": True,
                    },
                },
            ),
        )

        raw = response["choices"][0]["message"]["content"]
        breakpoint()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"Model did not return valid JSON: {e}\nRaw: {raw!r}") from e

        # Ensure document_id matches the input document
        data["document_id"] = doc.document_id
        try:
            return StatementMetaDataD.from_dict(data)
        except Exception as e:
            raise ValueError(f"Failed to construct StatementMetaDataD from data: {data}") from e


if __name__ == "__main__":
    import datetime as dt
    from pathlib import Path

    logging.basicConfig(level=logging.INFO)

    # Example usage:
    extractor = StatementMetadataExtractor()

    # Load a sample PDF file as bytes
    pdf_path = Path("./data/bank_statement_1.pdf")
    if not pdf_path.exists():
        raise FileNotFoundError(f"Sample PDF file not found: {pdf_path}")

    with pdf_path.open("rb") as f:
        pdf_bytes = f.read()

    doc = DocumentD(
        file_binary=pdf_bytes,
        as_of_date=dt.date.today(),
    )

    metadata = extractor.process(doc)
    print("Extracted Statement Metadata:")
    print(metadata)
