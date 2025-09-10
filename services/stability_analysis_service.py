from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Sequence
from decimal import Decimal
from statistics import mean
from typing import ClassVar

from domain.categories_d import RiskBucketD
from domain.statement_d import TransactionD, TransactionType
from domain.underwriting_d import MonthlyRollup, ProcessorMix, StabilityStats


class StabilityAnalysisService:
    """Service for analyzing income stability and payment processor patterns."""

    PROCESSOR_KEYWORDS: ClassVar[dict[str, str]] = {
        "stripe": "Stripe",
        "square": "Square",
        "shopify": "Shopify",
        "paypal": "PayPal",
        "braintree": "Braintree",
        "adyen": "Adyen",
        "amazon pay": "Amazon Pay",
        "skrill": "Skrill",
    }

    @classmethod
    def calculate_monthly_rollup(cls, transactions: list[TransactionD]) -> list[MonthlyRollup]:
        """Generate monthly rollup of income and expenses."""
        groups: dict[str, list[TransactionD]] = defaultdict(list)
        for t in transactions:
            year_month = f"{t.transaction_date.year:04d}-{t.transaction_date.month:02d}"
            groups[year_month].append(t)

        rollups: list[MonthlyRollup] = []
        for ym, txns in groups.items():
            deposits = cls._sum_decimal(
                t.transaction_amount
                for t in txns
                if t.transaction_type == TransactionType.CREDIT and not cls._is_transfer(t)
            )
            withdrawals = cls._sum_decimal(
                t.transaction_amount
                for t in txns
                if t.transaction_type == TransactionType.DEBIT and not cls._is_transfer(t)
            )

            rollups.append(
                MonthlyRollup(
                    ym=ym,
                    deposits=deposits,
                    withdrawals=withdrawals,
                    net=deposits - withdrawals,
                    txn_count=len(txns),
                )
            )

        rollups.sort(key=lambda r: r.ym)
        return rollups

    @classmethod
    def calculate_stability_stats(
        cls, transactions: list[TransactionD], monthly_rollup: Sequence[MonthlyRollup]
    ) -> StabilityStats:
        """Calculate stability metrics including deposit variability and trends."""
        deposits = [m.deposits for m in monthly_rollup]
        if not deposits:
            return StabilityStats(
                deposit_cv=0.0, deposit_slope_per_month=0.0, top_payer_share=0.0, unique_payers=0
            )

        # Calculate coefficient of variation for deposits
        deposit_values = [float(d) for d in deposits]
        mean_deposits = mean(deposit_values)

        if mean_deposits == 0:
            cv = 0.0
        else:
            variance = mean((x - mean_deposits) ** 2 for x in deposit_values)
            std_dev = variance**0.5
            cv = std_dev / mean_deposits

        # Calculate trend slope (simple linear regression)
        slope = cls._calculate_trend_slope(deposit_values)

        # Calculate payer concentration
        top_payer_share, unique_payers = cls._calculate_payer_concentration(transactions)

        return StabilityStats(
            deposit_cv=float(cv),
            deposit_slope_per_month=float(slope),
            top_payer_share=float(top_payer_share),
            unique_payers=unique_payers,
        )

    @classmethod
    def analyze_processor_mix(cls, transactions: list[TransactionD]) -> ProcessorMix:
        """Analyze payment processor distribution."""
        card_total = Decimal("0")
        ach_wires_total = Decimal("0")
        other_total = Decimal("0")
        processor_totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))

        for t in transactions:
            if t.transaction_type != TransactionType.CREDIT or cls._is_transfer(t):
                continue

            merchant_name = (getattr(t, "merchant_name", None) or "").lower()
            matched_processor = False

            # Check for known payment processors
            for keyword, label in cls.PROCESSOR_KEYWORDS.items():
                if keyword in merchant_name:
                    processor_totals[label] += t.transaction_amount
                    card_total += t.transaction_amount
                    matched_processor = True
                    break

            if matched_processor:
                continue

            # Categorize remaining transactions
            category = getattr(t, "category", None)
            bucket_name = getattr(getattr(category, "risk_bucket", None), "name", "")

            if "INCOME" in bucket_name or "OTHER" in bucket_name:
                other_total += t.transaction_amount
            else:
                ach_wires_total += t.transaction_amount

        top_processors = sorted(processor_totals.items(), key=lambda kv: kv[1], reverse=True)[:5]

        return ProcessorMix(
            card_settlements=card_total,
            ach_wires=ach_wires_total,
            other=other_total,
            top_processors=top_processors,
        )

    @classmethod
    def _calculate_trend_slope(cls, values: list[float]) -> float:
        """Calculate linear trend slope for deposit values."""
        n = len(values)
        if n < 2:
            return 0.0

        x_values = list(range(n))
        x_mean = mean(x_values)
        y_mean = mean(values)

        numerator = sum(
            (xi - x_mean) * (yi - y_mean) for xi, yi in zip(x_values, values, strict=False)
        )
        denominator = sum((xi - x_mean) ** 2 for xi in x_values) or 1.0

        return numerator / denominator

    @classmethod
    def _calculate_payer_concentration(cls, transactions: list[TransactionD]) -> tuple[float, int]:
        """Calculate top payer concentration and unique payer count."""
        payer_totals: Counter[str] = Counter()

        for t in transactions:
            if t.transaction_type != TransactionType.CREDIT or cls._is_transfer(t):
                continue

            payer_name = (getattr(t, "merchant_name", None) or "").strip().lower() or "unknown"
            payer_totals[payer_name] += float(t.transaction_amount)

        if not payer_totals:
            return 0.0, 0

        total_deposits = sum(payer_totals.values())
        top_payer_amount = max(payer_totals.values())
        top_payer_share = top_payer_amount / total_deposits if total_deposits > 0 else 0.0

        return top_payer_share, len(payer_totals)

    @classmethod
    def _is_transfer(cls, t: TransactionD) -> bool:
        """Check if transaction is a transfer/liquidity movement."""
        cat = getattr(t, "category", None)
        return bool(cat and getattr(cat, "risk_bucket", None) == RiskBucketD.LIQUIDITY_MOVEMENT)

    @staticmethod
    def _sum_decimal(values) -> Decimal:
        """Sum decimal values safely."""
        total = Decimal("0")
        for pv in values:
            total += v
        return total
