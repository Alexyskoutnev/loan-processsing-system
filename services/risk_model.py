from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import Enum

from domain.categories_d import RiskBucketD
from domain.statement_d import TransactionD, TransactionType
from services.transaction_bucket_service import TransactionRiskBucketService


class RiskRating(Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


@dataclass(frozen=True)
class RiskScore:
    score: int  # 0-100
    rating: RiskRating  # A-D


class RiskModel:
    @classmethod
    def score_risk(cls, transactions: list[TransactionD]) -> RiskScore:
        if not transactions:
            return RiskScore(0, RiskRating.D)

        # Calculate core metrics
        metrics = cls._calculate_core_metrics(transactions)

        # Calculate score components
        score = 50  # Start at middle
        score += cls._score_cash_flow(metrics["net_cash_flow"], metrics["income"])
        score += cls._score_debt_coverage(metrics["debt_payments"], metrics["net_cash_flow"])
        score += cls._score_activity_level(len(transactions))
        score += cls._score_income_size(metrics["income"])

        # Cap score and determine rating
        score = max(0, min(100, score))
        rating = cls._determine_rating(score)

        return RiskScore(score, rating)

    @classmethod
    def _calculate_core_metrics(cls, transactions: list[TransactionD]) -> dict:
        """Calculate core financial metrics"""
        buckets = TransactionRiskBucketService.categorize_and_bucket(transactions)
        income = cls._sum_credits(transactions)
        expenses = cls._sum_debits(transactions)
        net_cash_flow = income - expenses
        debt_payments = cls._sum_bucket_debits(buckets, RiskBucketD.FINANCING)

        return {
            "income": income,
            "expenses": expenses,
            "net_cash_flow": net_cash_flow,
            "debt_payments": debt_payments,
        }

    @classmethod
    def _score_cash_flow(cls, net_cash_flow: Decimal, income: Decimal) -> int:
        """Score cash flow component (40 points max)"""
        if net_cash_flow > 0:
            margin = float(net_cash_flow / income) if income > 0 else 0
            if margin >= 0.15:
                return 40
            elif margin >= 0.10:
                return 30
            elif margin >= 0.05:
                return 20
            else:
                return 10
        else:
            return -20  # Negative cash flow penalty

    @classmethod
    def _score_debt_coverage(cls, debt_payments: Decimal, net_cash_flow: Decimal) -> int:
        """Score debt coverage component (30 points max)"""
        if debt_payments > 0 and net_cash_flow > 0:
            dscr = float(net_cash_flow / debt_payments)
            if dscr >= 1.5:
                return 30
            elif dscr >= 1.25:
                return 25
            elif dscr >= 1.1:
                return 15
            else:
                return -10
        elif debt_payments == 0:
            return 20  # No debt is good
        else:
            return -30  # Can't service debt

    @classmethod
    def _score_activity_level(cls, transaction_count: int) -> int:
        """Score activity level component (20 points max)"""
        if transaction_count >= 100:
            return 20
        elif transaction_count >= 50:
            return 15
        elif transaction_count >= 20:
            return 10
        else:
            return 5

    @classmethod
    def _score_income_size(cls, income: Decimal) -> int:
        """Score income size component (10 points max)"""
        monthly_income = float(income)
        if monthly_income >= 100000:
            return 10
        elif monthly_income >= 50000:
            return 8
        elif monthly_income >= 25000:
            return 5
        elif monthly_income >= 10000:
            return 3
        else:
            return 0

    @classmethod
    def _determine_rating(cls, score: int) -> RiskRating:
        """Determine risk rating from score"""
        if score >= 80:
            return RiskRating.A
        elif score >= 65:
            return RiskRating.B
        elif score >= 45:
            return RiskRating.C
        else:
            return RiskRating.D

    @classmethod
    def _sum_credits(cls, transactions: list[TransactionD]) -> Decimal:
        return sum(
            t.transaction_amount
            for t in transactions
            if t.transaction_type == TransactionType.CREDIT and not cls._is_transfer(t)
        )

    @classmethod
    def _sum_debits(cls, transactions: list[TransactionD]) -> Decimal:
        return sum(
            t.transaction_amount
            for t in transactions
            if t.transaction_type == TransactionType.DEBIT and not cls._is_transfer(t)
        )

    @classmethod
    def _sum_bucket_debits(cls, buckets: dict, bucket: RiskBucketD) -> Decimal:
        """Sum debits in a specific bucket."""
        return sum(
            t.transaction_amount
            for t in buckets.get(bucket, [])
            if t.transaction_type == TransactionType.DEBIT
        )

    @classmethod
    def _is_transfer(cls, t: TransactionD) -> bool:
        cat = getattr(t, "category", None)
        return bool(cat and getattr(cat, "risk_bucket", None) == RiskBucketD.LIQUIDITY_MOVEMENT)


if __name__ == "__main__":
    from pathlib import Path

    from storage.document_dao import InMemDAO

    dao = InMemDAO()
    dao.load(Path("bin/documents.json"))
    documents = dao.list_documents()
    transactions = [t for doc in documents for t in doc.transactions]

    result = RiskModel.score_risk(transactions)
    print(f"Score: {result.score}/100")
    print(f"Rating: {result.rating.value}")
