from typing import Any
from extractor.base_extractor import BaseExtractor
from domain.bank_statement import Statement

import litellm

FILE_BINARY = bytes


STATEMENT_PROMPT = """
...
"""

class StatementExtractor(BaseExtractor[FILE_BINARY, Statement]):
    llm_model: str = "gpt-4"



    
    
    def _process(self, element: list[FILE_BINARY]) -> Statement:
        ...