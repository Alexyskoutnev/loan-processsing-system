from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal


def fmt_money(x: Decimal) -> str:
    q = x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"${q:,.2f}"


def fmt_pct(x: float) -> str:
    return f"{x:5.1f}%"


def bar(pct: float, width: int = 20) -> str:
    blocks = max(0, min(width, round((pct / 100.0) * width)))
    return "█" * blocks
