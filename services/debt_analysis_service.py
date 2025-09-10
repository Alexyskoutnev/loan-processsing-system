from __future__ import annotations

from collections import defaultdict
from collections.abc import Mapping
from decimal import Decimal
from statistics import median

from domain.categories_d import RiskBucketD
from domain.statement_d import TransactionD, TransactionType
from domain.underwriting_d import DebtMetrics, LoanSignal
from services.transaction_bucket_service import TransactionRiskBucketService


class DebtAnalysisService:
    @classmethod
    def calculate_debt_metrics(
        cls,
        buckets: Mapping[RiskBucketD, list[TransactionD]],
        net_cash_flow: Decimal,
        *,
        proposed_amount: Decimal | None = None,
        annual_rate: float | None = None,
        term_months: int | None = None,
    ) -> DebtMetrics:
        """Calculate comprehensive debt service metrics."""
        # Existing debt service
        eds = cls._calculate_debt_payments(buckets)

        # Proposed new payment
        new_payment = (
            cls.calculate_amortized_payment(proposed_amount, annual_rate, term_months)
            if all(v is not None for v in (proposed_amount, annual_rate, term_months))
            else Decimal("0")
        )

        # DSCR calculations
        dscr_existing = None if eds == 0 else cls._safe_ratio(net_cash_flow, eds)
        total_debt_service = eds + new_payment
        dscr_pro_forma = (
            None if total_debt_service == 0 else cls._safe_ratio(net_cash_flow, total_debt_service)
        )

        return DebtMetrics(
            existing_debt_service=eds,
            pro_forma_payment=new_payment,
            dscr_existing=dscr_existing,
            dscr_pro_forma=dscr_pro_forma,
        )

    @classmethod
    def detect_loan_signals(cls, transactions: list[TransactionD]) -> list[LoanSignal]:
        """Detect loan payment patterns from financing transactions."""
        buckets = TransactionRiskBucketService.categorize_and_bucket(transactions)
        financing_debits = [
            t
            for t in buckets.get(RiskBucketD.FINANCING, [])
            if t.transaction_type == TransactionType.DEBIT
        ]

        # Group by lender/merchant
        groups: dict[str, list[TransactionD]] = defaultdict(list)
        for t in financing_debits:
            name = (getattr(t, "merchant_name", None) or "").strip().lower()
            groups[name].append(t)

        signals: list[LoanSignal] = []
        for lender, transactions_group in groups.items():
            if len(transactions_group) < 2:
                continue

            # Sort by date and analyze cadence
            transactions_group.sort(key=lambda x: x.transaction_date)
            deltas = [
                (
                    transactions_group[i].transaction_date
                    - transactions_group[i - 1].transaction_date
                ).days
                for i in range(1, len(transactions_group))
            ]

            median_delta = median(deltas) if deltas else 30
            cadence = cls._determine_cadence(median_delta)

            # Calculate average payment
            avg_payment = cls._sum_decimal(
                t.transaction_amount.copy_abs() for t in transactions_group
            ) / Decimal(len(transactions_group))

            signals.append(
                LoanSignal(
                    lender=lender or "unknown",
                    avg_payment=avg_payment,
                    cadence=cadence,
                    count=len(transactions_group),
                )
            )

        return sorted(signals, key=lambda s: -s.avg_payment)

    @classmethod
    def _calculate_debt_payments(cls, buckets: Mapping[RiskBucketD, list[TransactionD]]) -> Decimal:
        """Calculate monthly existing debt service from FINANCING bucket debits."""
        financing_txns = buckets.get(RiskBucketD.FINANCING, [])
        return cls._sum_decimal(
            t.transaction_amount
            for t in financing_txns
            if t.transaction_type == TransactionType.DEBIT
        )

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

    @staticmethod
    def calculate_amortized_payment(
        amount: Decimal | None, annual_rate: float | None, term_months: int | None
    ) -> Decimal:
        """Calculate amortized payment: P = r * A / (1 - (1 + r)^(-n))"""
        if not amount or not annual_rate or not term_months or amount <= 0 or term_months <= 0:
            return Decimal("0")

        monthly_rate = Decimal(str(annual_rate)) / Decimal("12")
        if monthly_rate == 0:
            return (amount / Decimal(term_months)).quantize(Decimal("0.01"))

        denominator = Decimal("1") - (Decimal("1") + monthly_rate) ** Decimal(-term_months)
        payment = (monthly_rate * amount) / denominator
        return payment.quantize(Decimal("0.01"))

    @staticmethod
    def _sum_decimal(values) -> Decimal:
        """Sum decimal values safely."""
        total = Decimal("0")
        for v in values:
            total += v
        return total

    @staticmethod
    def _safe_ratio(numer: Decimal, denom: Decimal) -> float:
        """Return numer/denom as float (0.0 if denom==0)."""
        if denom == 0:
            return 0.0
        try:
            return float(numer / denom)
        except Exception:
            return 0.0
