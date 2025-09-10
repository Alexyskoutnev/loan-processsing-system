from __future__ import annotations

from collections.abc import Iterable
from enum import Enum


class TransactionCategory(Enum):
    # Income
    SALARY_WAGES = "salary_wages"
    BUSINESS_REVENUE = "business_revenue"
    INTEREST_INCOME = "interest_income"
    DIVIDENDS = "dividends"
    REFUND_REIMBURSEMENT = "refund_reimbursement"
    GOVERNMENT_PAYMENT = "government_payment"
    OTHER_INCOME = "other_income"

    # Housing / Facilities
    RENT = "rent"
    MORTGAGE = "mortgage"
    UTILITIES = "utilities"
    TELECOM_INTERNET = "telecom_internet"

    # Operating / Living Expenses
    PAYROLL_SALARIES = "payroll_salaries"
    PROFESSIONAL_SERVICES = "professional_services"
    OFFICE_SUPPLIES = "office_supplies"
    SOFTWARE_SUBSCRIPTIONS = "software_subscriptions"
    MARKETING_ADVERTISING = "marketing_advertising"
    VENDOR_PAYMENT = "vendor_payment"
    GROCERIES = "groceries"
    DINING = "dining"
    TRANSPORTATION = "transportation"
    TRAVEL_LODGING = "travel_lodging"
    HEALTHCARE_MEDICAL = "healthcare_medical"
    INSURANCE = "insurance"
    EDUCATION_TUITION = "education_tuition"
    CHILDCARE = "childcare"
    ENTERTAINMENT = "entertainment"
    PERSONAL_CARE = "personal_care"
    CHARITY_DONATION = "charity_donation"
    HOME_MAINTENANCE = "home_maintenance"

    # Financing / Debt
    LOAN_PAYMENT = "loan_payment"
    CREDIT_CARD_PAYMENT = "credit_card_payment"
    TAX_PAYMENT = "tax_payment"
    BANK_FEES = "bank_fees"
    INTEREST_EXPENSE = "interest_expense"

    # Capital / Assets
    CAPITAL_EXPENDITURE = "capital_expenditure"
    INVESTMENT_BUY = "investment_buy"
    INVESTMENT_SELL = "investment_sell"

    # Liquidity / Movements
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT = "transfer_out"
    CASH_DEPOSIT = "cash_deposit"
    WITHDRAWAL = "withdrawal"

    # Fallbacks
    OTHER = "other"
    ERROR = "error"

    def __str__(self) -> str:
        return self.value

    @classmethod
    def list_all(cls) -> list[str]:
        return [c.value for c in cls if c is not cls.ERROR]

    @classmethod
    def is_income(cls, cat: TransactionCategory) -> bool:
        return cat in {
            cls.SALARY_WAGES,
            cls.BUSINESS_REVENUE,
            cls.INTEREST_INCOME,
            cls.DIVIDENDS,
            cls.REFUND_REIMBURSEMENT,
            cls.GOVERNMENT_PAYMENT,
            cls.OTHER_INCOME,
            cls.INVESTMENT_SELL,
        }

    def to_json(self) -> str:
        return self.value

    @classmethod
    def from_json(cls, value: str) -> TransactionCategory:
        try:
            return cls(value)
        except ValueError:
            return cls.ERROR


class RiskBucket(Enum):
    INCOME = "income"
    OPERATING_EXPENSE = "operating_expense"
    DISCRETIONARY_EXPENSE = "discretionary_expense"
    FINANCING = "financing"
    TAXES = "taxes"
    CAPITAL = "capital"
    FEES_INTEREST = "fees_interest"
    LIQUIDITY_MOVEMENT = "liquidity_movement"
    OTHER = "other"

    def __str__(self) -> str:
        return self.value


CATEGORY_TO_BUCKET: dict[TransactionCategory, RiskBucket] = {
    # Income
    TransactionCategory.SALARY_WAGES: RiskBucket.INCOME,
    TransactionCategory.BUSINESS_REVENUE: RiskBucket.INCOME,
    TransactionCategory.INTEREST_INCOME: RiskBucket.INCOME,
    TransactionCategory.DIVIDENDS: RiskBucket.INCOME,
    TransactionCategory.REFUND_REIMBURSEMENT: RiskBucket.INCOME,
    TransactionCategory.GOVERNMENT_PAYMENT: RiskBucket.INCOME,
    TransactionCategory.OTHER_INCOME: RiskBucket.INCOME,
    TransactionCategory.INVESTMENT_SELL: RiskBucket.INCOME,
    # Operating (recurring/necessary)
    TransactionCategory.RENT: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.MORTGAGE: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.UTILITIES: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.TELECOM_INTERNET: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.PAYROLL_SALARIES: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.PROFESSIONAL_SERVICES: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.OFFICE_SUPPLIES: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.SOFTWARE_SUBSCRIPTIONS: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.MARKETING_ADVERTISING: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.VENDOR_PAYMENT: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.INSURANCE: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.HEALTHCARE_MEDICAL: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.HOME_MAINTENANCE: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.CHILDCARE: RiskBucket.OPERATING_EXPENSE,
    TransactionCategory.EDUCATION_TUITION: RiskBucket.OPERATING_EXPENSE,
    # Discretionary
    TransactionCategory.GROCERIES: RiskBucket.DISCRETIONARY_EXPENSE,
    TransactionCategory.DINING: RiskBucket.DISCRETIONARY_EXPENSE,
    TransactionCategory.TRANSPORTATION: RiskBucket.DISCRETIONARY_EXPENSE,
    TransactionCategory.TRAVEL_LODGING: RiskBucket.DISCRETIONARY_EXPENSE,
    TransactionCategory.ENTERTAINMENT: RiskBucket.DISCRETIONARY_EXPENSE,
    TransactionCategory.PERSONAL_CARE: RiskBucket.DISCRETIONARY_EXPENSE,
    TransactionCategory.CHARITY_DONATION: RiskBucket.DISCRETIONARY_EXPENSE,
    # Financing / debt
    TransactionCategory.LOAN_PAYMENT: RiskBucket.FINANCING,
    TransactionCategory.CREDIT_CARD_PAYMENT: RiskBucket.FINANCING,
    TransactionCategory.INTEREST_EXPENSE: RiskBucket.FINANCING,
    # Taxes
    TransactionCategory.TAX_PAYMENT: RiskBucket.TAXES,
    # Capital / investments
    TransactionCategory.CAPITAL_EXPENDITURE: RiskBucket.CAPITAL,
    TransactionCategory.INVESTMENT_BUY: RiskBucket.CAPITAL,
    # Fees/interest
    TransactionCategory.BANK_FEES: RiskBucket.FEES_INTEREST,
    # Liquidity moves
    TransactionCategory.TRANSFER_IN: RiskBucket.LIQUIDITY_MOVEMENT,
    TransactionCategory.TRANSFER_OUT: RiskBucket.LIQUIDITY_MOVEMENT,
    TransactionCategory.CASH_DEPOSIT: RiskBucket.LIQUIDITY_MOVEMENT,
    TransactionCategory.WITHDRAWAL: RiskBucket.LIQUIDITY_MOVEMENT,
    # Fallbacks
    TransactionCategory.OTHER: RiskBucket.OTHER,
    TransactionCategory.ERROR: RiskBucket.OTHER,
}


def bucket_of(category: TransactionCategory) -> RiskBucket:
    return CATEGORY_TO_BUCKET.get(category, RiskBucket.OTHER)


def validate_mapping(
    categories: Iterable[TransactionCategory] | None = None,
) -> list[TransactionCategory]:
    cats = (
        list(categories)
        if categories is not None
        else [c for c in TransactionCategory if c is not TransactionCategory.ERROR]
    )
    return [c for c in cats if c not in CATEGORY_TO_BUCKET]
