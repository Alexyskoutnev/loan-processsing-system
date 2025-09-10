from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from statistics import median

from domain.statement_d import TransactionD, TransactionType
from domain.underwriting_d import RecurringBill


class RecurringBillsService:
    @classmethod
    def detect_recurring_bills(cls, transactions: list[TransactionD]) -> list[RecurringBill]:
        # Group transactions by (merchant, category)
        groups: dict[tuple[str, str], list[TransactionD]] = defaultdict(list)

        for t in transactions:
            if t.transaction_type != TransactionType.DEBIT:
                continue

            merchant = cls._normalize_string(getattr(t, "merchant_name", None))
            category = getattr(getattr(t, "category", None), "name", "UNKNOWN")
            groups[(merchant, category)].append(t)

        recurring_bills: list[RecurringBill] = []

        for (merchant, category), txn_group in groups.items():
            if len(txn_group) < 3:  # Need at least 3 transactions to establish pattern
                continue

            # Sort by date and analyze timing patterns
            txn_group.sort(key=lambda x: x.transaction_date)
            deltas = [
                (txn_group[i].transaction_date - txn_group[i - 1].transaction_date).days
                for i in range(1, len(txn_group))
            ]

            if not deltas:
                continue

            # Determine cadence from median interval
            median_delta = median(deltas)
            cadence = cls._determine_cadence(median_delta)

            # Calculate amount statistics
            amounts = [t.transaction_amount.copy_abs() for t in txn_group]
            avg_amount = sum(amounts, Decimal("0")) / Decimal(len(amounts))

            # Calculate confidence based on amount consistency
            confidence = cls._calculate_confidence(amounts, avg_amount, cadence)

            # Filter for meaningful recurring bills
            if cadence != "irregular" and confidence >= 0.5 and avg_amount >= Decimal("50"):
                recurring_bills.append(
                    RecurringBill(
                        merchant=merchant or "unknown",
                        category=category,
                        avg_amount=avg_amount,
                        cadence=cadence,
                        count=len(txn_group),
                        confidence=confidence,
                    )
                )

        # Sort by priority (monthly first, then by amount)
        return sorted(recurring_bills, key=lambda r: (r.cadence != "monthly", -r.avg_amount))

    @staticmethod
    def _normalize_string(s: str | None) -> str:
        """Normalize string for consistent grouping."""
        return (s or "").strip().lower()

    @staticmethod
    def _determine_cadence(median_days: float) -> str:
        """Determine payment cadence from median days between payments."""
        if 26 <= median_days <= 35:
            return "monthly"
        elif 12 <= median_days <= 16:
            return "biweekly"
        elif 6 <= median_days <= 8:
            return "weekly"
        else:
            return "irregular"

    @classmethod
    def _calculate_confidence(
        cls, amounts: list[Decimal], avg_amount: Decimal, cadence: str
    ) -> float:
        """Calculate confidence score based on amount consistency and cadence."""
        if avg_amount == 0:
            return 0.0

        # Calculate coefficient of variation
        sum_squared_errors = sum((amount - avg_amount) ** 2 for amount in amounts)
        variance = sum_squared_errors / Decimal(len(amounts))
        std_dev = variance.sqrt() if avg_amount != 0 else Decimal("0")
        cv = float(std_dev / avg_amount) if avg_amount != 0 else 1.0

        # Base confidence depends on cadence regularity
        base_confidence = 0.9 if cadence != "irregular" else 0.5

        # Adjust for amount consistency
        consistency_factor = 1.0 - cv
        confidence = max(0.0, min(1.0, consistency_factor * base_confidence))

        return confidence
