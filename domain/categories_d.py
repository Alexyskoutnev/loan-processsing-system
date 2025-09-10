from __future__ import annotations

from collections.abc import Iterable
from enum import Enum


class TransactionCategoryD(Enum):
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
    def is_income(cls, cat: TransactionCategoryD) -> bool:
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
    def from_json(cls, value: str) -> TransactionCategoryD:
        try:
            return cls(value)
        except ValueError:
            return cls.ERROR


class RiskBucketD(Enum):
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


CATEGORY_TO_BUCKET: dict[TransactionCategoryD, RiskBucketD] = {
    # Income
    TransactionCategoryD.SALARY_WAGES: RiskBucketD.INCOME,
    TransactionCategoryD.BUSINESS_REVENUE: RiskBucketD.INCOME,
    TransactionCategoryD.INTEREST_INCOME: RiskBucketD.INCOME,
    TransactionCategoryD.DIVIDENDS: RiskBucketD.INCOME,
    TransactionCategoryD.REFUND_REIMBURSEMENT: RiskBucketD.INCOME,
    TransactionCategoryD.GOVERNMENT_PAYMENT: RiskBucketD.INCOME,
    TransactionCategoryD.OTHER_INCOME: RiskBucketD.INCOME,
    TransactionCategoryD.INVESTMENT_SELL: RiskBucketD.INCOME,
    # Operating (recurring/necessary)
    TransactionCategoryD.RENT: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.MORTGAGE: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.UTILITIES: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.TELECOM_INTERNET: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.PAYROLL_SALARIES: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.PROFESSIONAL_SERVICES: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.OFFICE_SUPPLIES: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.SOFTWARE_SUBSCRIPTIONS: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.MARKETING_ADVERTISING: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.VENDOR_PAYMENT: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.INSURANCE: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.HEALTHCARE_MEDICAL: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.HOME_MAINTENANCE: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.CHILDCARE: RiskBucketD.OPERATING_EXPENSE,
    TransactionCategoryD.EDUCATION_TUITION: RiskBucketD.OPERATING_EXPENSE,
    # Discretionary
    TransactionCategoryD.GROCERIES: RiskBucketD.DISCRETIONARY_EXPENSE,
    TransactionCategoryD.DINING: RiskBucketD.DISCRETIONARY_EXPENSE,
    TransactionCategoryD.TRANSPORTATION: RiskBucketD.DISCRETIONARY_EXPENSE,
    TransactionCategoryD.TRAVEL_LODGING: RiskBucketD.DISCRETIONARY_EXPENSE,
    TransactionCategoryD.ENTERTAINMENT: RiskBucketD.DISCRETIONARY_EXPENSE,
    TransactionCategoryD.PERSONAL_CARE: RiskBucketD.DISCRETIONARY_EXPENSE,
    TransactionCategoryD.CHARITY_DONATION: RiskBucketD.DISCRETIONARY_EXPENSE,
    # Financing / debt
    TransactionCategoryD.LOAN_PAYMENT: RiskBucketD.FINANCING,
    TransactionCategoryD.CREDIT_CARD_PAYMENT: RiskBucketD.FINANCING,
    TransactionCategoryD.INTEREST_EXPENSE: RiskBucketD.FINANCING,
    # Taxes
    TransactionCategoryD.TAX_PAYMENT: RiskBucketD.TAXES,
    # Capital / investments
    TransactionCategoryD.CAPITAL_EXPENDITURE: RiskBucketD.CAPITAL,
    TransactionCategoryD.INVESTMENT_BUY: RiskBucketD.CAPITAL,
    # Fees/interest
    TransactionCategoryD.BANK_FEES: RiskBucketD.FEES_INTEREST,
    # Liquidity moves
    TransactionCategoryD.TRANSFER_IN: RiskBucketD.LIQUIDITY_MOVEMENT,
    TransactionCategoryD.TRANSFER_OUT: RiskBucketD.LIQUIDITY_MOVEMENT,
    TransactionCategoryD.CASH_DEPOSIT: RiskBucketD.LIQUIDITY_MOVEMENT,
    TransactionCategoryD.WITHDRAWAL: RiskBucketD.LIQUIDITY_MOVEMENT,
    # Fallbacks
    TransactionCategoryD.OTHER: RiskBucketD.OTHER,
    TransactionCategoryD.ERROR: RiskBucketD.OTHER,
}


def bucket_of(category: TransactionCategoryD) -> RiskBucketD:
    return CATEGORY_TO_BUCKET.get(category, RiskBucketD.OTHER)


def validate_mapping(
    categories: Iterable[TransactionCategoryD] | None = None,
) -> list[TransactionCategoryD]:
    cats = (
        list(categories)
        if categories is not None
        else [c for c in TransactionCategoryD if c is not TransactionCategoryD.ERROR]
    )
    return [c for c in cats if c not in CATEGORY_TO_BUCKET]
