import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Typography, TextField, InputAdornment, FormControl, Select, MenuItem, OutlinedInput, Checkbox, ListItemText, ToggleButtonGroup, ToggleButton, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Tooltip, IconButton, useTheme } from '@mui/material';
import { Search as SearchIcon, Sort as SortIcon, GetApp as DownloadIcon } from '@mui/icons-material';
import ApiService from '../services/api';

const MenuProps = {
  PaperProps: {
    style: { maxHeight: 48 * 6.5, width: 240 }
  }
};

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
const getCategoryStyle = (category) => {
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

function normalizeTransaction(txn, documentId) {
  const rawAmount = parseFloat(txn.transaction_amount ?? txn.amount ?? 0);
  const date = txn.transaction_date ?? txn.date ?? null;
  const description = txn.transaction_description ?? txn.description ?? '';
  const type = txn.transaction_type ?? (rawAmount < 0 ? 'debit' : 'credit');
  let category = txn.category;
  if (category && typeof category === 'object') category = category.value ?? category.name ?? 'other';
  if (!category) category = 'other';
  const amount = Math.abs(rawAmount);
  const signedAmount = type === 'debit' ? -Math.abs(amount) : Math.abs(amount);
  return {
    id: txn.transaction_id ?? txn.id ?? `${documentId}-${date ?? 'na'}-${description.slice(0, 20)}-${Math.random().toString(36).slice(2, 7)}`,
    documentId,
    date,
    description,
    amount,
    signedAmount,
    type,
    category,
  };
}

function exportToCsv(rows) {
  const header = ['Document ID', 'Date', 'Description', 'Category', 'Type', 'Amount'];
  const lines = [header.join(',')].concat(
    rows.map(r => [r.documentId, r.date ?? '', JSON.stringify(r.description), r.category, r.type, r.signedAmount].join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'selected-transactions.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const SelectedTransactionsPage = ({ selectedIds = [] }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const load = async () => {
      if (!selectedIds || selectedIds.length === 0) {
        setTransactions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await ApiService.getTransactionsBulk(selectedIds);
        const txns = (res.transactions ?? []).map(t => normalizeTransaction(t, t.document_id));
        setTransactions(txns);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedIds?.join('|')]);

  const categories = useMemo(() => {
    const set = new Set(transactions.map(t => t.category));
    return Array.from(set).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => !search || (t.description?.toLowerCase().includes(search.toLowerCase())))
      .filter(t => (typeFilter === 'all') || t.type === typeFilter)
      .filter(t => (categoryFilter.length === 0) || categoryFilter.includes(t.category))
      .filter(t => (minAmount === '' || t.amount >= parseFloat(minAmount)))
      .filter(t => (maxAmount === '' || t.amount <= parseFloat(maxAmount)))
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'amount') return (a.amount - b.amount) * dir;
        if (sortBy === 'category') return a.category.localeCompare(b.category) * dir;
        if (sortBy === 'description') return a.description.localeCompare(b.description) * dir;
        return (new Date(a.date || 0) - new Date(b.date || 0)) * dir;
      });
  }, [transactions, search, typeFilter, categoryFilter, minAmount, maxAmount, sortBy, sortDir]);

  const totals = useMemo(() => {
    let credits = 0, debits = 0;
    for (const t of filtered) {
      if (t.type === 'credit') credits += Math.abs(t.amount); else debits += Math.abs(t.amount);
    }
    const net = credits - debits;
    return { credits, debits, net };
  }, [filtered]);

  const toggleSort = (field) => {
    if (sortBy !== field) {
      setSortBy(field);
      setSortDir('desc');
    } else {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>Transactions</Typography>
        <Chip label={`${filtered.length} rows`} size="small" sx={{ mr: 1 }} />
        <Chip label={`Credits ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.credits)}`} color="success" variant="outlined" size="small" sx={{ mr: 1 }} />
        <Chip label={`Debits ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.debits)}`} color="error" variant="outlined" size="small" sx={{ mr: 1 }} />
        <Chip label={`Net ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.net)}`} variant="outlined" size="small" />
        <Tooltip title="Export CSV">
          <span>
            <IconButton onClick={() => exportToCsv(filtered)} disabled={filtered.length === 0} sx={{ ml: 1 }}>
              <DownloadIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Box sx={{ p: 2, pt: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
        />

        <FormControl size="small">
          <Select
            multiple
            displayEmpty
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            input={<OutlinedInput placeholder="Categories" />}
            renderValue={(selected) => {
              if (selected.length === 0) {
                return <span style={{ color: '#6b7280' }}>All categories</span>;
              }
              return selected.map(cat => CATEGORY_DISPLAY_NAMES[cat] || cat).join(', ');
            }}
            MenuProps={MenuProps}
          >
            {categories.map((name) => (
              <MenuItem key={name} value={name}>
                <Checkbox checked={categoryFilter.indexOf(name) > -1} />
                <ListItemText primary={CATEGORY_DISPLAY_NAMES[name] || name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup size="small" value={typeFilter} exclusive onChange={(e, v) => v && setTypeFilter(v)}>
          <ToggleButton value="all">All Types</ToggleButton>
          <ToggleButton value="credit">Credit</ToggleButton>
          <ToggleButton value="debit">Debit</ToggleButton>
        </ToggleButtonGroup>

        <TextField size="small" label="Min Amount" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} type="number" />
        <TextField size="small" label="Max Amount" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} type="number" />
      </Box>

      {/* Table */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Paper 
          variant="outlined"
          sx={{ 
            borderRadius: 3, 
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.12)',
            border: '1px solid rgba(0,0,0,0.06)'
          }}
        >
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow sx={{ 
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderBottom: '2px solid #e2e8f0'
                }}>
                  <TableCell onClick={() => toggleSort('date')} sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 600,
                    color: '#374151', 
                    fontSize: '0.875rem',
                    letterSpacing: '0.025em',
                    py: 2
                  }}>Date <SortIcon fontSize="inherit" /></TableCell>
                  <TableCell onClick={() => toggleSort('description')} sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 600,
                    color: '#374151', 
                    fontSize: '0.875rem',
                    letterSpacing: '0.025em',
                    py: 2
                  }}>Description <SortIcon fontSize="inherit" /></TableCell>
                  <TableCell onClick={() => toggleSort('category')} sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 600,
                    color: '#374151', 
                    fontSize: '0.875rem',
                    letterSpacing: '0.025em',
                    py: 2
                  }}>Category <SortIcon fontSize="inherit" /></TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600,
                    color: '#374151', 
                    fontSize: '0.875rem',
                    letterSpacing: '0.025em',
                    py: 2
                  }}>Type</TableCell>
                  <TableCell onClick={() => toggleSort('amount')} align="right" sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 600,
                    color: '#374151', 
                    fontSize: '0.875rem',
                    letterSpacing: '0.025em',
                    py: 2
                  }}>Amount <SortIcon fontSize="inherit" /></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>Loading…</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>No transactions match the filters.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t, index) => (
                    <TableRow 
                      key={t.id} 
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
                        {t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell sx={{ 
                        maxWidth: 480, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        color: '#374151',
                        fontWeight: 500,
                        py: 2
                      }} title={t.description}>
                        {t.description || 'N/A'}
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip 
                          label={CATEGORY_DISPLAY_NAMES[t.category] || t.category} 
                          size="small" 
                          variant="filled"
                          sx={{
                            ...getCategoryStyle(t.category),
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
                          label={t.type === 'credit' ? 'Credit' : 'Debit'}
                          size="small"
                          variant="filled"
                          sx={{
                            backgroundColor: t.type === 'credit' ? '#dcfce7' : '#fef2f2',
                            color: t.type === 'credit' ? '#166534' : '#991b1b',
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
                        color: t.type === 'credit' ? '#059669' : '#dc2626',
                        fontSize: '0.95rem',
                        py: 2
                      }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(t.signedAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
};

export default SelectedTransactionsPage;


