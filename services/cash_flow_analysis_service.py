from __future__ import annotations

from collections.abc import Mapping
from decimal import Decimal

from domain.categories_d import RiskBucketD
from domain.statement_d import TransactionD, TransactionType
from domain.underwriting_d import CashFlowMetrics


class CashFlowAnalysisService:
    """Service for analyzing cash flow patterns from transactions."""

    @classmethod
    def calculate_cash_flow_metrics(
        cls, transactions: list[TransactionD], buckets: Mapping[RiskBucketD, list[TransactionD]]
    ) -> CashFlowMetrics:
        """Calculate comprehensive cash flow metrics."""
        # Basic cash flow (excluding transfers)
        income = cls._calculate_income(transactions)
        expenses = cls._calculate_expenses(transactions)
        net_cash_flow = income - expenses
        cash_flow_margin = cls._safe_ratio(net_cash_flow, income, as_percent=True)

        # Expense breakdown by type
        operating_expenses = cls._calculate_operating_expenses(buckets)
        discretionary_expenses = cls._calculate_discretionary_expenses(buckets)

        # Expense ratios
        operating_ratio = cls._safe_ratio(operating_expenses, expenses)
        discretionary_ratio = cls._safe_ratio(discretionary_expenses, expenses)

        return CashFlowMetrics(
            monthly_income=income,
            monthly_expenses=expenses,
            net_cash_flow=net_cash_flow,
            cash_flow_margin=cash_flow_margin,
            operating_expenses=operating_expenses,
            discretionary_expenses=discretionary_expenses,
            operating_expense_ratio=operating_ratio,
            discretionary_expense_ratio=discretionary_ratio,
        )

    @classmethod
    def _is_transfer(cls, t: TransactionD) -> bool:
        """Check if transaction is a transfer/liquidity movement."""
        cat = getattr(t, "category", None)
        return bool(cat and getattr(cat, "risk_bucket", None) == RiskBucketD.LIQUIDITY_MOVEMENT)

    @classmethod
    def _calculate_income(cls, transactions: list[TransactionD]) -> Decimal:
        """Calculate total income excluding transfers."""
        return cls._sum_decimal(
            t.transaction_amount
            for t in transactions
            if t.transaction_type == TransactionType.CREDIT and not cls._is_transfer(t)
        )

    @classmethod
    def _calculate_expenses(cls, transactions: list[TransactionD]) -> Decimal:
        """Calculate total expenses excluding transfers."""
        return cls._sum_decimal(
            t.transaction_amount
            for t in transactions
            if t.transaction_type == TransactionType.DEBIT and not cls._is_transfer(t)
        )

    @classmethod
    def _calculate_operating_expenses(
        cls, buckets: Mapping[RiskBucketD, list[TransactionD]]
    ) -> Decimal:
        """Calculate operating expenses from OPERATING_EXPENSE bucket debits."""
        operating_txns = buckets.get(RiskBucketD.OPERATING_EXPENSE, [])
        return cls._sum_decimal(
            t.transaction_amount
            for t in operating_txns
            if t.transaction_type == TransactionType.DEBIT
        )

    @classmethod
    def _calculate_discretionary_expenses(
        cls, buckets: Mapping[RiskBucketD, list[TransactionD]]
    ) -> Decimal:
        """Calculate discretionary expenses from DISCRETIONARY_EXPENSE bucket debits."""
        discretionary_txns = buckets.get(RiskBucketD.DISCRETIONARY_EXPENSE, [])
        return cls._sum_decimal(
            t.transaction_amount
            for t in discretionary_txns
            if t.transaction_type == TransactionType.DEBIT
        )

    @classmethod
    def calculate_liquidity_flows(
        cls, buckets: Mapping[RiskBucketD, list[TransactionD]]
    ) -> tuple[Decimal, Decimal]:
        """Calculate liquidity inflows and outflows from LIQUIDITY_MOVEMENT bucket."""
        liquidity_txns = buckets.get(RiskBucketD.LIQUIDITY_MOVEMENT, [])

        inflows = cls._sum_decimal(
            t.transaction_amount
            for t in liquidity_txns
            if t.transaction_type == TransactionType.CREDIT
        )

        outflows = cls._sum_decimal(
            t.transaction_amount
            for t in liquidity_txns
            if t.transaction_type == TransactionType.DEBIT
        )

        return inflows, outflows

    @staticmethod
    def _sum_decimal(values) -> Decimal:
        """Sum decimal values safely."""
        total = Decimal("0")
        for v in values:
            total += v
        return total

    @staticmethod
    def _safe_ratio(numer: Decimal, denom: Decimal, *, as_percent: bool = False) -> float:
        """Return numer/denom as float (0.0 if denom==0). If as_percent, multiply by 100."""
        if denom == 0:
            return 0.0
        try:
            val = float(numer / denom)
        except Exception:
            return 0.0
        return val * (100.0 if as_percent else 1.0)
