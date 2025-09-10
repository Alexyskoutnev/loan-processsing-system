from __future__ import annotations

from collections import defaultdict
from collections.abc import Mapping
from decimal import Decimal

from domain.categories_d import RiskBucketD
from domain.statement_d import TransactionD
from domain.underwriting_d import BucketBreakdown, UnderwritingMetrics
from services.cash_flow_analysis_service import CashFlowAnalysisService
from services.debt_analysis_service import DebtAnalysisService
from services.liquidity_analysis_service import LiquidityAnalysisService
from services.recurring_bills_service import RecurringBillsService
from services.risk_flags_service import RiskFlagsService
from services.stability_analysis_service import StabilityAnalysisService
from services.transaction_bucket_service import TransactionRiskBucketService


class UnderwritingMetricsService:
    """
    Orchestrates various analysis services to produce comprehensive underwriting metrics.

    This service acts as a facade, coordinating multiple specialized services:
    - CashFlowAnalysisService: Income, expenses, and cash flow calculations
    - DebtAnalysisService: Debt service and DSCR calculations
    - StabilityAnalysisService: Income stability and processor mix analysis
    - LiquidityAnalysisService: Account balance and liquidity analysis
    - RiskFlagsService: Risk pattern detection
    - RecurringBillsService: Recurring payment pattern detection
    """

    @classmethod
    def calculate_metrics(
        cls,
        transactions: list[TransactionD],
        *,
        proposed_amount: Decimal | None = None,
        annual_rate: float | None = None,
        term_months: int | None = None,
    ) -> UnderwritingMetrics:
        """
        Calculate comprehensive underwriting metrics from transactions.

        Args:
            transactions: List of transaction data
            proposed_amount: Proposed loan amount for pro-forma calculations
            annual_rate: Annual interest rate for loan calculations
            term_months: Loan term in months

        Returns:
            UnderwritingMetrics with all calculated metrics
        """
        if not transactions:
            raise ValueError("No transactions provided")

        # Categorize transactions into risk buckets
        buckets = TransactionRiskBucketService.categorize_and_bucket(transactions)

        # Calculate cash flow metrics
        cash_flow = CashFlowAnalysisService.calculate_cash_flow_metrics(transactions, buckets)

        # Calculate debt metrics
        debt = DebtAnalysisService.calculate_debt_metrics(
            buckets,
            cash_flow.net_cash_flow,
            proposed_amount=proposed_amount,
            annual_rate=annual_rate,
            term_months=term_months,
        )

        # Calculate liquidity flows
        liquidity_in, liquidity_out = CashFlowAnalysisService.calculate_liquidity_flows(buckets)

        # Calculate activity metrics
        total_amount = sum((t.transaction_amount for t in transactions), Decimal("0"))
        avg_transaction_size = (
            total_amount / Decimal(len(transactions)) if transactions else Decimal("0")
        )

        # Generate monthly rollup and stability stats
        monthly_rollup = StabilityAnalysisService.calculate_monthly_rollup(transactions)
        stability = StabilityAnalysisService.calculate_stability_stats(transactions, monthly_rollup)

        # Analyze processor mix
        processor_mix = StabilityAnalysisService.analyze_processor_mix(transactions)

        # Calculate liquidity statistics
        liquidity = LiquidityAnalysisService.calculate_liquidity_stats(transactions)

        # Detect patterns and insights
        recurring_bills = RecurringBillsService.detect_recurring_bills(transactions)
        loan_signals = DebtAnalysisService.detect_loan_signals(transactions)
        bucket_breakdown = cls._create_bucket_breakdown(buckets)
        red_flags = RiskFlagsService.detect_red_flags(transactions)

        return UnderwritingMetrics(
            cash_flow=cash_flow,
            debt=debt,
            liquidity_in=liquidity_in,
            liquidity_out=liquidity_out,
            transaction_count=len(transactions),
            average_transaction_size=avg_transaction_size,
            stability=stability,
            processor_mix=processor_mix,
            liquidity=liquidity,
            recurring_bills=recurring_bills,
            loan_signals=loan_signals,
            bucket_breakdown=bucket_breakdown,
            monthly_rollup=monthly_rollup,
            red_flags=red_flags,
        )

    @classmethod
    def calculate_metrics_by_month(
        cls, transactions: list[TransactionD]
    ) -> dict[str, UnderwritingMetrics]:
        """Calculate metrics grouped by calendar month (YYYY-MM)."""
        groups: dict[str, list[TransactionD]] = defaultdict(list)
        for t in transactions:
            year_month = f"{t.transaction_date.year:04d}-{t.transaction_date.month:02d}"
            groups[year_month].append(t)

        return {ym: cls.calculate_metrics(txns) for ym, txns in groups.items()}

    @classmethod
    def _create_bucket_breakdown(
        cls, buckets: Mapping[RiskBucketD, list[TransactionD]]
    ) -> list[BucketBreakdown]:
        """Create bucket breakdown analysis."""
        totals: dict[RiskBucketD, Decimal] = {}
        counts: dict[RiskBucketD, int] = {}
        overall_total = Decimal("0")

        for bucket, txns in buckets.items():
            amount = sum((t.transaction_amount.copy_abs() for t in txns), Decimal("0"))
            totals[bucket] = amount
            counts[bucket] = len(txns)
            overall_total += amount

        breakdown: list[BucketBreakdown] = []
        for bucket, amount in totals.items():
            percentage = (
                0.0 if overall_total == 0 else float((amount / overall_total) * Decimal(100))
            )

            breakdown.append(
                BucketBreakdown(
                    bucket=getattr(bucket, "name", str(bucket)),
                    txn_count=counts[bucket],
                    total_amount=amount,
                    pct_of_total=percentage,
                )
            )

        return sorted(breakdown, key=lambda r: r.total_amount, reverse=True)
