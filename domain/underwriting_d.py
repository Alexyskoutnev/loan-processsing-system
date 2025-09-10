from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class RecurringBill:
    merchant: str
    category: str
    avg_amount: Decimal
    cadence: str  # "monthly" | "biweekly" | "weekly" | "irregular"
    count: int
    confidence: float  # 0..1


@dataclass(frozen=True)
class LoanSignal:
    lender: str
    avg_payment: Decimal
    cadence: str
    count: int


@dataclass(frozen=True)
class BucketBreakdown:
    bucket: str
    txn_count: int
    total_amount: Decimal
    pct_of_total: float


@dataclass(frozen=True)
class StabilityStats:
    deposit_cv: float  # coefficient of variation (by month)
    deposit_slope_per_month: float  # simple linear trend on monthly deposits
    top_payer_share: float  # 0..1
    unique_payers: int


@dataclass(frozen=True)
class LiquidityStats:
    avg_daily_balance: Decimal | None
    min_daily_balance: Decimal | None
    days_negative: int
    nsf_count: int
    nsf_fees: Decimal


@dataclass(frozen=True)
class ProcessorMix:
    card_settlements: Decimal
    ach_wires: Decimal
    other: Decimal
    top_processors: list[tuple[str, Decimal]]  # [(name, total_amount)]


@dataclass(frozen=True)
class RedFlags:
    chargebacks_count: int
    gambling_crypto_hits: int
    large_cash_withdrawals: int
    round_number_cash_deposits: int


@dataclass(frozen=True)
class MonthlyRollup:
    ym: str
    deposits: Decimal
    withdrawals: Decimal
    net: Decimal
    txn_count: int


@dataclass(frozen=True)
class CashFlowMetrics:
    monthly_income: Decimal
    monthly_expenses: Decimal
    net_cash_flow: Decimal
    cash_flow_margin: float  # % (0..100)
    operating_expenses: Decimal
    discretionary_expenses: Decimal
    operating_expense_ratio: float
    discretionary_expense_ratio: float


@dataclass(frozen=True)
class DebtMetrics:
    existing_debt_service: Decimal  # EDS (monthly)
    pro_forma_payment: Decimal  # proposed new payment (if inputs provided)
    dscr_existing: float | None  # NCF / EDS (None if EDS==0)
    dscr_pro_forma: float | None  # NCF / (EDS + new_payment) (None if PDS==0)


@dataclass(frozen=True)
class UnderwritingMetrics:
    # Cash Flow
    cash_flow: CashFlowMetrics

    # Debt
    debt: DebtMetrics

    # Liquidity movement (informational)
    liquidity_in: Decimal
    liquidity_out: Decimal

    # Activity
    transaction_count: int
    average_transaction_size: Decimal

    # Stability & trajectory
    stability: StabilityStats
    processor_mix: ProcessorMix

    # Liquidity & cushion
    liquidity: LiquidityStats

    # Insights
    recurring_bills: Sequence[RecurringBill]
    loan_signals: Sequence[LoanSignal]
    bucket_breakdown: Sequence[BucketBreakdown]
    monthly_rollup: Sequence[MonthlyRollup]

    # Red flags
    red_flags: RedFlags

    # Convenience properties for backward compatibility
    @property
    def monthly_income(self) -> Decimal:
        return self.cash_flow.monthly_income

    @property
    def monthly_expenses(self) -> Decimal:
        return self.cash_flow.monthly_expenses

    @property
    def net_cash_flow(self) -> Decimal:
        return self.cash_flow.net_cash_flow

    @property
    def cash_flow_margin(self) -> float:
        return self.cash_flow.cash_flow_margin

    @property
    def existing_debt_service(self) -> Decimal:
        return self.debt.existing_debt_service

    @property
    def pro_forma_payment(self) -> Decimal:
        return self.debt.pro_forma_payment

    @property
    def dscr_existing(self) -> float | None:
        return self.debt.dscr_existing

    @property
    def dscr_pro_forma(self) -> float | None:
        return self.debt.dscr_pro_forma

    @property
    def operating_expense_ratio(self) -> float:
        return self.cash_flow.operating_expense_ratio

    @property
    def discretionary_expense_ratio(self) -> float:
        return self.cash_flow.discretionary_expense_ratio
