from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal

from domain.statement_d import TransactionD, TransactionType
from domain.underwriting_d import LiquidityStats


class LiquidityAnalysisService:
    """Service for analyzing account liquidity and balance patterns."""

    NSF_KEYWORDS = ("nsf", "non-sufficient", "returned item charge", "overdraft")

    @classmethod
    def calculate_liquidity_stats(cls, transactions: list[TransactionD]) -> LiquidityStats:
        """Calculate comprehensive liquidity statistics."""
        # Group transactions by day
        daily_transactions: dict[date, list[TransactionD]] = defaultdict(list)
        for t in transactions:
            daily_transactions[t.transaction_date].append(t)

        # Calculate daily balance statistics if balance data is available
        daily_minimums: list[Decimal] = []
        daily_endings: list[Decimal] = []
        days_negative = 0

        has_balance_data = any(hasattr(t, "balance_after") for t in transactions)

        if has_balance_data:
            for _day, day_txns in daily_transactions.items():
                # Sort by posting time or transaction date
                sorted_txns = sorted(
                    day_txns, key=lambda x: getattr(x, "posted_at", x.transaction_date)
                )

                # Get ending balance for the day
                ending_balance = getattr(sorted_txns[-1], "balance_after", None)
                if ending_balance is None:
                    continue

                # Find minimum balance during the day
                balances = [
                    getattr(t, "balance_after", ending_balance)
                    for t in sorted_txns
                    if hasattr(t, "balance_after")
                ]
                day_minimum = min(balances) if balances else ending_balance

                daily_endings.append(ending_balance)
                daily_minimums.append(day_minimum)

                if ending_balance < 0:
                    days_negative += 1

            avg_balance = (
                sum(daily_endings, Decimal("0")) / Decimal(len(daily_endings))
                if daily_endings
                else None
            )
            min_balance = min(daily_minimums) if daily_minimums else None
        else:
            avg_balance = None
            min_balance = None

        # Analyze NSF/overdraft fees
        nsf_count, nsf_fees = cls._analyze_nsf_fees(transactions)

        return LiquidityStats(
            avg_daily_balance=avg_balance,
            min_daily_balance=min_balance,
            days_negative=days_negative,
            nsf_count=nsf_count,
            nsf_fees=nsf_fees,
        )

    @classmethod
    def _analyze_nsf_fees(cls, transactions: list[TransactionD]) -> tuple[int, Decimal]:
        """Analyze NSF/overdraft fees and counts."""
        nsf_count = 0
        nsf_fees = Decimal("0")

        for t in transactions:
            description = (getattr(t, "merchant_name", None) or "").lower()

            if any(keyword in description for keyword in cls.NSF_KEYWORDS):
                nsf_count += 1
                if t.transaction_type == TransactionType.DEBIT:
                    nsf_fees += t.transaction_amount

        return nsf_count, nsf_fees
