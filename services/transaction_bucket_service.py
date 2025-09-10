from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from domain.categories_d import RiskBucketD, TransactionCategoryD, bucket_of
from domain.statement_d import TransactionD
from utils.format import bar, fmt_money, fmt_pct


@dataclass
class BucketSummary:
    bucket: RiskBucketD
    transaction_count: int
    total_amount: Decimal
    percentage_of_total: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "bucket": self.bucket.value,
            "transaction_count": self.transaction_count,
            "total_amount": str(self.total_amount),
            "percentage_of_total": self.percentage_of_total,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BucketSummary:
        return cls(
            bucket=RiskBucketD(data["bucket"]),
            transaction_count=int(data["transaction_count"]),
            total_amount=Decimal(data["total_amount"]),
            percentage_of_total=float(data["percentage_of_total"]),
        )

    def __str__(self) -> str:
        label = getattr(self.bucket, "name", str(self.bucket))
        return (
            f"{label:<18} | {self.transaction_count:5d} | "
            f"{fmt_money(self.total_amount):>14} | {fmt_pct(self.percentage_of_total):>6} | "
            f"{bar(self.percentage_of_total)}"
        )

    def __repr__(self) -> str:
        return (
            "BucketSummary("
            f"bucket={self.bucket!r}, "
            f"transaction_count={self.transaction_count!r}, "
            f"total_amount={self.total_amount!r}, "
            f"percentage_of_total={self.percentage_of_total!r}"
            ")"
        )


class TransactionRiskBucketService:
    @classmethod
    def categorize_and_bucket(
        cls, transactions: list[TransactionD]
    ) -> dict[RiskBucketD, list[TransactionD]]:
        if not transactions:
            return {}
        buckets: dict[RiskBucketD, list[TransactionD]] = {}
        for txn in transactions:
            category = txn.category or TransactionCategoryD.ERROR
            b = bucket_of(category)
            buckets.setdefault(b, []).append(txn)
        return buckets

    @staticmethod
    def _sum_decimal(values: Iterable[Decimal]) -> Decimal:
        return sum(values, start=Decimal("0"))

    @classmethod
    def get_bucket_stats(cls, transactions: list[TransactionD]) -> list[BucketSummary]:
        buckets = cls.categorize_and_bucket(transactions)
        total_amount: Decimal = cls._sum_decimal(t.transaction_amount for t in transactions)

        summaries: list[BucketSummary] = []
        for bucket, txns in buckets.items():
            bucket_total: Decimal = cls._sum_decimal(t.transaction_amount for t in txns)
            pct = float((bucket_total / total_amount) * Decimal(100)) if total_amount != 0 else 0.0
            summaries.append(
                BucketSummary(
                    bucket=bucket,
                    transaction_count=len(txns),
                    total_amount=bucket_total,
                    percentage_of_total=pct,
                )
            )

        return sorted(summaries, key=lambda s: s.total_amount, reverse=True)


def print_bucket_table(rows: list[BucketSummary]) -> None:
    header = "BUCKET             |   CNT |        TOTAL |     % | BAR"
    divider = "-" * len(header)
    print(header)
    print(divider)
    for r in rows:
        print(str(r))


if __name__ == "__main__":
    from pathlib import Path

    from storage.document_dao import InMemDAO

    dao = InMemDAO()
    json_file = Path("bin/documents.json")
    dao.load(json_file)
    documents = dao.list_documents()
    transactions = [t for doc in documents for t in doc.transactions]

    stats = TransactionRiskBucketService.get_bucket_stats(transactions)

    print_bucket_table(stats)
