from typing import Any
from extractor.base_extractor import BaseExtractor

class StatementExtractor(BaseExtractor[Any, Any]):
    llm_model: str = "gpt-4"
    
    
    def _process(self, element: str) -> dict:
        # Dummy implementation for illustration purposes
        # In a real scenario, this would involve parsing the bank statement text
        # and extracting relevant information into a structured format.
        return {
            "bank_name": "Example Bank",
            "account_holder_name": "John Doe",
            "account_number": "123456789",
            "statement_start_date": "2023-01-01",
            "statement_end_date": "2023-01-31",
            "statement_opening_balance": 1000.00,
            "statement_closing_balance": 1500.00,
            "transactions": [
                {
                    "transaction_id": "tx001",
                    "transaction_date": "2023-01-05",
                    "transaction_amount": -50.00,
                    "transaction_description": "Grocery Store",
                    "transaction_type": "debit"
                },
                {
                    "transaction_id": "tx002",
                    "transaction_date": "2023-01-10",
                    "transaction_amount": 200.00,
                    "transaction_description": "Salary",
                    "transaction_type": "credit"
                }
            ]
        }