from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from typing import ClassVar

import litellm

from domain.categories import TransactionCategory
from domain.statement_d import TransactionD, TransactionType
from extractor.base_extractor import BaseExtractor


# NOTE: Architecturally, this should be a Transformer/Enricher, not an Extractor.
class TransactionCategorizationExtractor(BaseExtractor[list[TransactionD], list[TransactionD]]):
    DEFAULT_MODEL: ClassVar[str] = "openai/gpt-5-mini"  # or "openai/gpt-5"
    DEFAULT_WORKERS: ClassVar[int] = 16

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        workers: int = DEFAULT_WORKERS,
    ) -> None:
        self.model = model
        self.workers = workers
        self._prompt_template = self._create_prompt_template()

    # ----- Prompt -----
    def _create_prompt_template(self) -> str:
        cats = ", ".join(TransactionCategory.list_all())
        return (
            "You are a financial assistant that categorizes business and personal transactions.\n"
            f"Choose the single best category from: {cats}\n\n"
            "Transaction:\n"
            "- Description: {description}\n"
            "- Amount: ${amount}\n"
            "- Type: {transaction_type}\n"
            "- Date: {date}\n\n"
            "Reply with ONLY the category name (lowercase enum value). If unsure, reply 'other'."
        )

    def _build_prompt(self, txn: TransactionD) -> str:
        try:
            return self._prompt_template.format(
                description=txn.transaction_description or "No description",
                amount=abs(txn.transaction_amount),
                transaction_type=txn.transaction_type.value if txn.transaction_type else "unknown",
                date=txn.transaction_date.isoformat(),
            )
        except Exception as e:
            logging.warning("Failed to format prompt for transaction %s: %s", txn.transaction_id, e)
            return f"Categorize this transaction: {txn.transaction_description or 'No description'}"

    def _check_fees_interest(
        self, desc: str, txn_type: TransactionType
    ) -> TransactionCategory | None:
        """Check for fees and interest patterns."""
        if any(x in desc for x in ("ACCOUNT FEE", "SERVICE FEE", "BANK FEE", "CHARGE:")):
            return TransactionCategory.BANK_FEES
        if "INTEREST" in desc:
            return (
                TransactionCategory.INTEREST_INCOME
                if txn_type == TransactionType.CREDIT
                else TransactionCategory.INTEREST_EXPENSE
            )
        return None

    def _check_utilities_telecom(self, desc: str) -> TransactionCategory | None:
        """Check for utilities and telecom patterns."""
        if any(x in desc for x in ("POWER", "ELECTRIC", "WATER", "GAS", "UTILITY")):
            return TransactionCategory.UTILITIES
        if any(
            x in desc
            for x in ("TELSTRA", "VODAFONE", "AT&T", "VERIZON", "T-MOBILE", "INTERNET", "BROADBAND")
        ):
            return TransactionCategory.TELECOM_INTERNET
        return None

    def _check_housing(self, desc: str) -> TransactionCategory | None:
        """Check for housing patterns."""
        if "RENT" in desc:
            return TransactionCategory.RENT
        if any(x in desc for x in ("MORTGAGE", "ESCROW")):
            return TransactionCategory.MORTGAGE
        return None

    def _check_payroll_government(
        self, desc: str, txn_type: TransactionType
    ) -> TransactionCategory | None:
        """Check for payroll and government patterns."""
        if any(x in desc for x in ("PAYROLL", "PAY RUN", "SALARY", "WAGES")):
            return (
                TransactionCategory.SALARY_WAGES
                if txn_type == TransactionType.CREDIT
                else TransactionCategory.PAYROLL_SALARIES
            )
        if (
            any(x in desc for x in ("TREAS 310", "IRS", "TAX REFUND", "SSA", "STATE OF", "CITY OF"))
            and txn_type == TransactionType.CREDIT
        ):
            return TransactionCategory.GOVERNMENT_PAYMENT
        return None

    def _check_transfers_cards(
        self, desc: str, txn_type: TransactionType
    ) -> TransactionCategory | None:
        """Check for transfers and card transactions."""
        if any(x in desc for x in ("ATM", "CASH WITHDRAWAL", "CSH", "CPT")):
            return TransactionCategory.WITHDRAWAL
        if any(x in desc for x in ("TRANSFER", "NEFT", "IMPS", "FPI", "UPI")):
            return (
                TransactionCategory.TRANSFER_IN
                if txn_type == TransactionType.CREDIT
                else TransactionCategory.TRANSFER_OUT
            )
        if any(x in desc for x in ("POS", "DEBIT PURCHASE", "CARD", "SWIPE", "MERCHANT")):
            return TransactionCategory.VENDOR_PAYMENT
        return None

    def _check_lifestyle(self, desc: str) -> TransactionCategory | None:
        """Check for lifestyle patterns (insurance, dining, groceries)."""
        if "INSURANCE" in desc or "PREMIUM" in desc:
            return TransactionCategory.INSURANCE
        if any(x in desc for x in ("STARBUCKS", "CAFE", "RESTAURANT", "UBER EATS", "DOORDASH")):
            return TransactionCategory.DINING
        if any(
            x in desc
            for x in (
                "GROCERY",
                "MARKET",
                "SUPERMARKET",
                "WALMART",
                "COSTCO",
                "KROGER",
                "WHOLE FOODS",
            )
        ):
            return TransactionCategory.GROCERIES
        return None

    def _rules_category(self, txn: TransactionD) -> TransactionCategory | None:
        """Apply simple rules to categorize the transaction. Return None if no rule matched."""
        # THIS HELPS REDUCE THE LLMs USAGE AND SPEEDS UP THE PROCESSING
        desc = (txn.transaction_description or "").upper()

        # Apply categorization rules in sequence - return early on first match
        for checker in [
            lambda: self._check_fees_interest(desc, txn.transaction_type),
            lambda: self._check_utilities_telecom(desc),
            lambda: self._check_housing(desc),
            lambda: self._check_payroll_government(desc, txn.transaction_type),
            lambda: self._check_transfers_cards(desc, txn.transaction_type),
            lambda: self._check_lifestyle(desc),
        ]:
            result = checker()
            if result is not None:
                return result

        return None

    def _categorize_single_transaction(self, txn: TransactionD) -> TransactionD:
        try:
            # First try rule-based categorization
            hit = self._rules_category(txn)
            if hit is not None:
                txn.category = hit
                return txn

            # Fall back to LLM categorization
            resp = litellm.completion(  # type: ignore[no-untyped-call]
                model=self.model,
                messages=[{"role": "user", "content": self._build_prompt(txn)}],
            )

            # Extract content safely from untyped response, fix weird typing errors
            try:
                # litellm returns an untyped object, so we access it carefully
                raw = str(resp["choices"][0]["message"]["content"] or "")  # type: ignore[index,call-overload]
            except (KeyError, IndexError, TypeError):
                logging.warning("Unexpected response format from LLM: %s", resp)
                raw = ""
            cat = self._parse_category_response(raw)
            txn.category = cat
            return txn
        except Exception as e:
            logging.exception("Failed to categorize transaction %s: %s", txn.transaction_id, e)
            txn.category = TransactionCategory.ERROR
            return txn

    def _parse_category_response(self, response_text: str) -> TransactionCategory:
        cat_str = (response_text or "").strip().lower()
        try:
            return TransactionCategory(cat_str)
        except ValueError:
            logging.warning("Unknown category '%s', defaulting to OTHER", cat_str)
            return TransactionCategory.OTHER

    def _process(self, element: list[TransactionD]) -> list[TransactionD]:
        if not element:
            return []

        results: list[TransactionD | None] = [None] * len(element)
        completed = 0

        def worker(i: int, t: TransactionD) -> tuple[int, TransactionD]:
            nonlocal completed
            out = self._categorize_single_transaction(t)
            completed += 1
            if out.category is None:
                logging.warning("Transaction categorization returned None, defaulting to ERROR")
                out.category = TransactionCategory.ERROR
            logging.info(
                "[%d/%d] %s → %s",
                completed,
                len(element),
                (t.transaction_description or "No desc")[:60],
                out.category.value,
            )
            return i, out

        with ThreadPoolExecutor(max_workers=self.workers) as ex:
            futs = [ex.submit(worker, i, t) for i, t in enumerate(element)]
            for f in as_completed(futs):
                try:
                    i, res = f.result(timeout=60)
                    results[i] = res
                except Exception as e:
                    logging.exception("Failed to categorize transaction: %s", e)

        # fill failures
        final_results: list[TransactionD] = []
        for i, r in enumerate(results):
            if r is None:
                # TODO: Better logging to determine what went wrong
                logging.error("Transaction %d failed to categorize, marking as ERROR", i)
                # Create a copy of the original transaction with ERROR category
                failed_txn = TransactionD(
                    document_id=element[i].document_id,
                    transaction_date=element[i].transaction_date,
                    transaction_amount=element[i].transaction_amount,
                    transaction_description=element[i].transaction_description,
                    transaction_type=element[i].transaction_type,
                    transaction_id=element[i].transaction_id,
                    category=TransactionCategory.ERROR,
                )
                final_results.append(failed_txn)
            else:
                final_results.append(r)

        return final_results
