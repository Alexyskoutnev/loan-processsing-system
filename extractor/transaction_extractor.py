from extractor.base_extractor import BaseExtractor
from domain.document_d import DocumentD
from domain.statement_d import TransactionD

import litellm


class TransactionExtractor(BaseExtractor[DocumentD, list[TransactionD]]):
    llm_model: str = "gpt-4"

    def _process(self, element: DocumentD) -> list[TransactionD]:
        ...