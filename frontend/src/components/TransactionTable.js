import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Typography, CircularProgress, useTheme } from '@mui/material';

// User-friendly category names mapping
const CATEGORY_DISPLAY_NAMES = {
  // Income
  'salary_wages': 'Salary & Wages',
  'business_revenue': 'Business Revenue',
  'interest_income': 'Interest Income',
  'dividends': 'Dividends',
  'refund_reimbursement': 'Refunds',
  'government_payment': 'Government Payment',
  'other_income': 'Other Income',
  
  // Housing & Facilities
  'rent': 'Rent',
  'mortgage': 'Mortgage',
  'utilities': 'Utilities',
  'telecom_internet': 'Internet & Phone',
  
  // Operating & Living
  'payroll_salaries': 'Payroll',
  'professional_services': 'Professional Services',
  'office_supplies': 'Office Supplies',
  'software_subscriptions': 'Software & Apps',
  'marketing_advertising': 'Marketing',
  'vendor_payment': 'Vendor Payments',
  'groceries': 'Groceries',
  'dining': 'Dining Out',
  'transportation': 'Transportation',
  'travel_lodging': 'Travel & Hotels',
  'healthcare_medical': 'Healthcare',
  'insurance': 'Insurance',
  'education_tuition': 'Education',
  'childcare': 'Childcare',
  'entertainment': 'Entertainment',
  'personal_care': 'Personal Care',
  'charity_donation': 'Donations',
  'home_maintenance': 'Home Maintenance',
  
  // Financing & Debt
  'loan_payment': 'Loan Payment',
  'credit_card_payment': 'Credit Card Payment',
  'tax_payment': 'Taxes',
  'bank_fees': 'Bank Fees',
  'interest_expense': 'Interest Expense',
  
  // Capital & Assets
  'capital_expenditure': 'Capital Purchase',
  'investment_buy': 'Investment Purchase',
  'investment_sell': 'Investment Sale',
  
  // Liquidity & Movements
  'transfer_in': 'Transfer In',
  'transfer_out': 'Transfer Out',
  'cash_deposit': 'Cash Deposit',
  'withdrawal': 'Cash Withdrawal',
  
  // Fallbacks
  'other': 'Other',
  'error': 'Uncategorized'
};

// Category styling with Apple-inspired colors
const getCategoryStyle = (category, theme) => {
  const styles = {
    // Income - Green spectrum
    'salary_wages': { bgcolor: '#D1FAE5', color: '#065F46', borderColor: '#10B981' },
    'business_revenue': { bgcolor: '#DCFCE7', color: '#166534', borderColor: '#22C55E' },
    'interest_income': { bgcolor: '#F0FDF4', color: '#14532D', borderColor: '#84CC16' },
    'dividends': { bgcolor: '#ECFDF5', color: '#064E3B', borderColor: '#059669' },
    'refund_reimbursement': { bgcolor: '#D1FAE5', color: '#065F46', borderColor: '#10B981' },
    'government_payment': { bgcolor: '#DCFCE7', color: '#166534', borderColor: '#22C55E' },
    'other_income': { bgcolor: '#F0FDF4', color: '#14532D', borderColor: '#84CC16' },
    'investment_sell': { bgcolor: '#ECFDF5', color: '#064E3B', borderColor: '#059669' },
    
    // Housing - Blue spectrum
    'rent': { bgcolor: '#DBEAFE', color: '#1E3A8A', borderColor: '#3B82F6' },
    'mortgage': { bgcolor: '#DBEAFE', color: '#1E3A8A', borderColor: '#2563EB' },
    'utilities': { bgcolor: '#E0F2FE', color: '#0C4A6E', borderColor: '#0EA5E9' },
    'telecom_internet': { bgcolor: '#F0F9FF', color: '#0C4A6E', borderColor: '#06B6D4' },
    
    // Operating - Purple spectrum
    'payroll_salaries': { bgcolor: '#F3E8FF', color: '#581C87', borderColor: '#8B5CF6' },
    'professional_services': { bgcolor: '#FAF5FF', color: '#6B21A8', borderColor: '#A855F7' },
    'office_supplies': { bgcolor: '#F3E8FF', color: '#581C87', borderColor: '#8B5CF6' },
    'software_subscriptions': { bgcolor: '#EDE9FE', color: '#5B21B6', borderColor: '#7C3AED' },
    'marketing_advertising': { bgcolor: '#F3E8FF', color: '#581C87', borderColor: '#8B5CF6' },
    'vendor_payment': { bgcolor: '#FAF5FF', color: '#6B21A8', borderColor: '#A855F7' },
    'insurance': { bgcolor: '#EDE9FE', color: '#5B21B6', borderColor: '#7C3AED' },
    'healthcare_medical': { bgcolor: '#F3E8FF', color: '#581C87', borderColor: '#8B5CF6' },
    'home_maintenance': { bgcolor: '#FAF5FF', color: '#6B21A8', borderColor: '#A855F7' },
    'childcare': { bgcolor: '#EDE9FE', color: '#5B21B6', borderColor: '#7C3AED' },
    'education_tuition': { bgcolor: '#F3E8FF', color: '#581C87', borderColor: '#8B5CF6' },
    
    // Discretionary - Orange spectrum
    'groceries': { bgcolor: '#FFF7ED', color: '#9A3412', borderColor: '#F97316' },
    'dining': { bgcolor: '#FFEDD5', color: '#C2410C', borderColor: '#EA580C' },
    'transportation': { bgcolor: '#FED7AA', color: '#EA580C', borderColor: '#FB923C' },
    'travel_lodging': { bgcolor: '#FFEDD5', color: '#C2410C', borderColor: '#EA580C' },
    'entertainment': { bgcolor: '#FFF7ED', color: '#9A3412', borderColor: '#F97316' },
    'personal_care': { bgcolor: '#FFEDD5', color: '#C2410C', borderColor: '#EA580C' },
    'charity_donation': { bgcolor: '#FED7AA', color: '#EA580C', borderColor: '#FB923C' },
    
    // Financing - Red spectrum
    'loan_payment': { bgcolor: '#FEF2F2', color: '#991B1B', borderColor: '#EF4444' },
    'credit_card_payment': { bgcolor: '#FECACA', color: '#7F1D1D', borderColor: '#DC2626' },
    'interest_expense': { bgcolor: '#FEE2E2', color: '#991B1B', borderColor: '#F87171' },
    'tax_payment': { bgcolor: '#FEF2F2', color: '#991B1B', borderColor: '#EF4444' },
    'bank_fees': { bgcolor: '#FECACA', color: '#7F1D1D', borderColor: '#DC2626' },
    
    // Capital - Indigo spectrum
    'capital_expenditure': { bgcolor: '#EEF2FF', color: '#3730A3', borderColor: '#6366F1' },
    'investment_buy': { bgcolor: '#E0E7FF', color: '#312E81', borderColor: '#4F46E5' },
    
    // Liquidity - Cyan spectrum
    'transfer_in': { bgcolor: '#ECFEFF', color: '#155E75', borderColor: '#06B6D4' },
    'transfer_out': { bgcolor: '#CFFAFE', color: '#164E63', borderColor: '#0891B2' },
    'cash_deposit': { bgcolor: '#ECFEFF', color: '#155E75', borderColor: '#06B6D4' },
    'withdrawal': { bgcolor: '#CFFAFE', color: '#164E63', borderColor: '#0891B2' },
    
    // Fallbacks - Gray spectrum
    'other': { bgcolor: '#F9FAFB', color: '#374151', borderColor: '#9CA3AF' },
    'error': { bgcolor: '#FEF2F2', color: '#991B1B', borderColor: '#EF4444' }
  };
  
  return styles[category] || styles['other'];
};

const normalize = (t) => {
  const rawAmount = parseFloat(t.transaction_amount ?? t.amount ?? 0);
  const date = t.transaction_date ?? t.date ?? null;
  const description = t.transaction_description ?? t.description ?? '';
  let category = t.category;
  if (category && typeof category === 'object') category = category.value ?? category.name ?? 'other';
  if (!category) category = 'other';
  const type = (t.transaction_type ?? t.type ?? (rawAmount < 0 ? 'debit' : 'credit'));
  const amount = Math.abs(rawAmount);
  const signedAmount = type === 'debit' ? -Math.abs(amount) : Math.abs(amount);
  return {
    id: t.transaction_id || t.id || `${date}-${description}`,
    date,
    description,
    category,
    amount, // magnitude
    signedAmount,
    type,
  };
};

const TransactionTable = ({ transactions, loading = false }) => {
  const theme = useTheme();
  
  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const rows = (transactions || []).map(normalize);

  if (rows.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        No transactions found.
      </Paper>
    );
  }

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        borderRadius: 3, 
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.12)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
    >
      <Box sx={{ p: 3, pb: 2, background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
          Transactions ({rows.length})
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 400 }}>
          Extracted and categorized transactions from the bank statement
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table size="medium" stickyHeader>
          <TableHead>
            <TableRow sx={{ 
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: '#374151', 
                fontSize: '0.875rem',
                letterSpacing: '0.025em',
                py: 2
              }}>Date</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: '#374151', 
                fontSize: '0.875rem',
                letterSpacing: '0.025em',
                py: 2
              }}>Description</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: '#374151', 
                fontSize: '0.875rem',
                letterSpacing: '0.025em',
                py: 2
              }}>Category</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: '#374151', 
                fontSize: '0.875rem',
                letterSpacing: '0.025em',
                py: 2
              }}>Type</TableCell>
              <TableCell align="right" sx={{ 
                fontWeight: 600, 
                color: '#374151', 
                fontSize: '0.875rem',
                letterSpacing: '0.025em',
                py: 2
              }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, index) => (
              <TableRow 
                key={r.id} 
                hover
                sx={{
                  backgroundColor: index % 2 === 0 ? '#fdfdfd' : '#f9fafb',
                  '&:hover': {
                    backgroundColor: '#f1f5f9',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease-in-out'
                  },
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <TableCell sx={{ 
                  color: '#64748b', 
                  fontWeight: 500,
                  py: 2
                }}>
                  {r.date ? new Date(r.date).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell sx={{ 
                  maxWidth: 400, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  color: '#374151',
                  fontWeight: 500,
                  py: 2
                }} title={r.description}>
                  {r.description || 'N/A'}
                </TableCell>
                <TableCell sx={{ py: 2 }}>
                  <Chip 
                    label={CATEGORY_DISPLAY_NAMES[r.category] || r.category} 
                    size="small" 
                    variant="filled"
                    sx={{
                      ...getCategoryStyle(r.category, theme),
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 28,
                      borderRadius: 2,
                      border: 'none'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ py: 2 }}>
                  <Chip
                    label={r.type === 'credit' ? 'Credit' : 'Debit'}
                    size="small"
                    variant="filled"
                    sx={{
                      backgroundColor: r.type === 'credit' ? '#dcfce7' : '#fef2f2',
                      color: r.type === 'credit' ? '#166534' : '#991b1b',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 28,
                      borderRadius: 2,
                      border: 'none'
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ 
                  fontWeight: 700, 
                  color: r.type === 'credit' ? '#059669' : '#dc2626',
                  fontSize: '0.95rem',
                  py: 2
                }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.signedAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TransactionTable;