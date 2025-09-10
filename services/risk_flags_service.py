from __future__ import annotations

from decimal import Decimal

from domain.statement_d import TransactionD, TransactionType
from domain.underwriting_d import RedFlags


class RiskFlagsService:
    """Service for detecting risk flags in transaction patterns."""

    CHARGEBACK_KEYWORDS = ("chargeback", "return item", "reversal", "ach r0")
    GAMBLING_CRYPTO_KEYWORDS = ("casino", "bet", "gambl", "crypto", "coinbase", "binance")
    CASH_KEYWORDS = ("cash", "atm")

    @classmethod
    def detect_red_flags(cls, transactions: list[TransactionD]) -> RedFlags:
        """Detect various red flags in transaction patterns."""
        chargebacks = 0
        gambling_crypto_hits = 0
        large_cash_withdrawals = 0
        round_cash_deposits = 0

        for t in transactions:
            description = (getattr(t, "merchant_name", None) or "").lower()
            amount = t.transaction_amount.copy_abs()

            # Check for chargebacks
            if any(keyword in description for keyword in cls.CHARGEBACK_KEYWORDS):
                chargebacks += 1

            # Check for gambling/crypto activity
            if any(keyword in description for keyword in cls.GAMBLING_CRYPTO_KEYWORDS):
                gambling_crypto_hits += 1

            # Check for large cash withdrawals
            if (
                t.transaction_type == TransactionType.DEBIT
                and any(keyword in description for keyword in cls.CASH_KEYWORDS)
                and amount >= Decimal("1000")
            ):
                large_cash_withdrawals += 1

            # Check for round number cash deposits
            if (
                t.transaction_type == TransactionType.CREDIT
                and any(keyword in description for keyword in cls.CASH_KEYWORDS)
                and cls._is_round_number(amount)
                and amount >= Decimal("500")
            ):
                round_cash_deposits += 1

        return RedFlags(
            chargebacks_count=chargebacks,
            gambling_crypto_hits=gambling_crypto_hits,
            large_cash_withdrawals=large_cash_withdrawals,
            round_number_cash_deposits=round_cash_deposits,
        )

    @staticmethod
    def _is_round_number(amount: Decimal) -> bool:
        return amount % Decimal("100") == 0
