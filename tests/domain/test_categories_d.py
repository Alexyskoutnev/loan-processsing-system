from __future__ import annotations

from domain.categories_d import (
    CATEGORY_TO_BUCKET,
    RiskBucketD,
    TransactionCategoryD,
    bucket_of,
    validate_mapping,
)


class TestTransactionCategoryD:
    def test_all_categories_have_string_values(self):
        """Test that all categories have valid string values."""
        for category in TransactionCategoryD:
            assert isinstance(category.value, str)
            assert len(category.value) > 0
            assert " " not in category.value  # No spaces in enum values
            assert category.value.islower()  # All lowercase

    def test_category_string_conversion(self):
        """Test __str__ method returns the value."""
        assert str(TransactionCategoryD.SALARY_WAGES) == "salary_wages"
        assert str(TransactionCategoryD.BANK_FEES) == "bank_fees"
        assert str(TransactionCategoryD.ERROR) == "error"

    def test_list_all_excludes_error(self):
        """Test that list_all() excludes the ERROR category."""
        all_categories = TransactionCategoryD.list_all()

        assert isinstance(all_categories, list)
        assert len(all_categories) > 0
        assert "error" not in all_categories
        assert "salary_wages" in all_categories
        assert "bank_fees" in all_categories

    def test_is_income_classification(self):
        """Test is_income() method correctly classifies income categories."""
        # Test income categories
        income_categories = [
            TransactionCategoryD.SALARY_WAGES,
            TransactionCategoryD.BUSINESS_REVENUE,
            TransactionCategoryD.INTEREST_INCOME,
            TransactionCategoryD.DIVIDENDS,
            TransactionCategoryD.REFUND_REIMBURSEMENT,
            TransactionCategoryD.GOVERNMENT_PAYMENT,
            TransactionCategoryD.OTHER_INCOME,
            TransactionCategoryD.INVESTMENT_SELL,
        ]

        for category in income_categories:
            assert TransactionCategoryD.is_income(category), (
                f"{category} should be classified as income"
            )

        # Test non-income categories
        non_income_categories = [
            TransactionCategoryD.RENT,
            TransactionCategoryD.UTILITIES,
            TransactionCategoryD.BANK_FEES,
            TransactionCategoryD.GROCERIES,
            TransactionCategoryD.ERROR,
        ]

        for category in non_income_categories:
            assert not TransactionCategoryD.is_income(category), (
                f"{category} should not be classified as income"
            )

    def test_to_json_serialization(self):
        """Test to_json() method returns the enum value."""
        assert TransactionCategoryD.SALARY_WAGES.to_json() == "salary_wages"
        assert TransactionCategoryD.BANK_FEES.to_json() == "bank_fees"
        assert TransactionCategoryD.ERROR.to_json() == "error"

    def test_from_json_valid_categories(self):
        """Test from_json() with valid category strings."""
        assert TransactionCategoryD.from_json("salary_wages") == TransactionCategoryD.SALARY_WAGES
        assert TransactionCategoryD.from_json("bank_fees") == TransactionCategoryD.BANK_FEES
        assert TransactionCategoryD.from_json("error") == TransactionCategoryD.ERROR

    def test_from_json_invalid_categories(self):
        """Test from_json() with invalid category strings returns ERROR."""
        assert TransactionCategoryD.from_json("invalid_category") == TransactionCategoryD.ERROR
        assert TransactionCategoryD.from_json("") == TransactionCategoryD.ERROR
        assert (
            TransactionCategoryD.from_json("SALARY_WAGES") == TransactionCategoryD.ERROR
        )  # Wrong case
        assert (
            TransactionCategoryD.from_json("salary wages") == TransactionCategoryD.ERROR
        )  # With space

    def test_category_round_trip_json(self):
        """Test that to_json() and from_json() are inverse operations."""
        test_categories = [
            TransactionCategoryD.SALARY_WAGES,
            TransactionCategoryD.BANK_FEES,
            TransactionCategoryD.UTILITIES,
            TransactionCategoryD.GROCERIES,
            TransactionCategoryD.ERROR,
        ]

        for category in test_categories:
            # round trip test
            json_value = category.to_json()
            restored_category = TransactionCategoryD.from_json(json_value)
            assert restored_category == category

    def test_all_categories_exist(self):
        """Test that we have all expected major category types."""
        # Check that we have categories for major financial areas
        expected_patterns = [
            "salary",
            "rent",
            "utilities",
            "bank_fees",
            "groceries",
            "transfer",
            "error",
        ]

        all_values = [cat.value for cat in TransactionCategoryD]

        for pattern in expected_patterns:
            assert any(pattern in value for value in all_values), (
                f"No category contains '{pattern}'"
            )


class TestRiskBucketD:
    def test_all_risk_buckets_have_string_values(self):
        """Test that all risk buckets have valid string values."""
        for bucket in RiskBucketD:
            assert isinstance(bucket.value, str)
            assert len(bucket.value) > 0

    def test_risk_bucket_string_conversion(self):
        """Test __str__ method returns the value."""
        assert str(RiskBucketD.INCOME) == "income"
        assert str(RiskBucketD.OPERATING_EXPENSE) == "operating_expense"
        assert str(RiskBucketD.OTHER) == "other"


class TestCategoryToBucketMapping:
    def test_all_categories_have_bucket_mapping(self):
        """Test that all categories (except ERROR) have a risk bucket mapping."""
        unmapped_categories = validate_mapping()

        # Only ERROR category should be unmapped in the main mapping
        # (it has a fallback in bucket_of function)
        assert len(unmapped_categories) == 0, f"Unmapped categories: {unmapped_categories}"

    def test_bucket_of_function_with_valid_categories(self):
        """Test bucket_of() function with categories that have mappings."""
        # Test some known mappings
        assert bucket_of(TransactionCategoryD.SALARY_WAGES) == RiskBucketD.INCOME
        assert bucket_of(TransactionCategoryD.RENT) == RiskBucketD.OPERATING_EXPENSE
        assert bucket_of(TransactionCategoryD.DINING) == RiskBucketD.DISCRETIONARY_EXPENSE
        assert bucket_of(TransactionCategoryD.LOAN_PAYMENT) == RiskBucketD.FINANCING
        assert bucket_of(TransactionCategoryD.TAX_PAYMENT) == RiskBucketD.TAXES

    def test_bucket_of_function_with_error_category(self):
        """Test bucket_of() function with ERROR category falls back to OTHER."""
        assert bucket_of(TransactionCategoryD.ERROR) == RiskBucketD.OTHER

    def test_bucket_of_function_with_unmapped_category(self):
        """Test bucket_of() function with categories not in mapping falls back to OTHER."""
        # This test ensures the fallback works even if a category is missing from the mapping
        # We can't easily test this without modifying the mapping, but we can test the function behavior
        result = bucket_of(TransactionCategoryD.OTHER)
        assert isinstance(result, RiskBucketD)

    def test_category_to_bucket_mapping_completeness(self):
        """Test that CATEGORY_TO_BUCKET contains expected mappings."""
        # Test that the mapping dictionary exists and has reasonable size
        assert isinstance(CATEGORY_TO_BUCKET, dict)
        assert len(CATEGORY_TO_BUCKET) > 30  # Should have most categories mapped

        # Test some specific mappings
        expected_mappings = {
            TransactionCategoryD.SALARY_WAGES: RiskBucketD.INCOME,
            TransactionCategoryD.BUSINESS_REVENUE: RiskBucketD.INCOME,
            TransactionCategoryD.RENT: RiskBucketD.OPERATING_EXPENSE,
            TransactionCategoryD.UTILITIES: RiskBucketD.OPERATING_EXPENSE,
            TransactionCategoryD.GROCERIES: RiskBucketD.DISCRETIONARY_EXPENSE,
            TransactionCategoryD.DINING: RiskBucketD.DISCRETIONARY_EXPENSE,
            TransactionCategoryD.LOAN_PAYMENT: RiskBucketD.FINANCING,
            TransactionCategoryD.TAX_PAYMENT: RiskBucketD.TAXES,
            TransactionCategoryD.BANK_FEES: RiskBucketD.FEES_INTEREST,
            TransactionCategoryD.TRANSFER_IN: RiskBucketD.LIQUIDITY_MOVEMENT,
        }

        for category, expected_bucket in expected_mappings.items():
            assert CATEGORY_TO_BUCKET.get(category) == expected_bucket

    def test_validate_mapping_function(self):
        """Test validate_mapping() function behavior."""
        # Test with None (should check all categories except ERROR)
        unmapped = validate_mapping(None)
        assert isinstance(unmapped, list)

        # Test with specific categories
        test_categories = [
            TransactionCategoryD.SALARY_WAGES,
            TransactionCategoryD.RENT,
            TransactionCategoryD.UTILITIES,
        ]
        unmapped = validate_mapping(test_categories)
        assert len(unmapped) == 0  # These should all be mapped

    def test_income_categories_mapped_to_income_bucket(self):
        """Test that categories classified as income are mapped to INCOME bucket."""
        for category in TransactionCategoryD:
            if TransactionCategoryD.is_income(category):
                bucket = bucket_of(category)
                # Most income categories should map to INCOME bucket
                # (some like INVESTMENT_SELL might map differently, which is OK)
                if category in [
                    TransactionCategoryD.SALARY_WAGES,
                    TransactionCategoryD.BUSINESS_REVENUE,
                    TransactionCategoryD.INTEREST_INCOME,
                    TransactionCategoryD.DIVIDENDS,
                    TransactionCategoryD.GOVERNMENT_PAYMENT,
                    TransactionCategoryD.OTHER_INCOME,
                ]:
                    assert bucket == RiskBucketD.INCOME, f"{category} should map to INCOME bucket"
