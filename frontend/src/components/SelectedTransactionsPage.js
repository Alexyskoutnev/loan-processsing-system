import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Typography, TextField, InputAdornment, FormControl, Select, MenuItem, OutlinedInput, Checkbox, ListItemText, ToggleButtonGroup, ToggleButton, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Tooltip, IconButton } from '@mui/material';
import { Search as SearchIcon, Sort as SortIcon, GetApp as DownloadIcon } from '@mui/icons-material';
import ApiService from '../services/api';

const MenuProps = {
  PaperProps: {
    style: { maxHeight: 48 * 6.5, width: 240 }
  }
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
        <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>Selected Transactions</Typography>
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
              return selected.join(', ');
            }}
            MenuProps={MenuProps}
          >
            {categories.map((name) => (
              <MenuItem key={name} value={name}>
                <Checkbox checked={categoryFilter.indexOf(name) > -1} />
                <ListItemText primary={name} />
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
        <Paper variant="outlined">
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell onClick={() => toggleSort('date')} sx={{ cursor: 'pointer', fontWeight: 600 }}>Date <SortIcon fontSize="inherit" /></TableCell>
                  <TableCell onClick={() => toggleSort('description')} sx={{ cursor: 'pointer', fontWeight: 600 }}>Description <SortIcon fontSize="inherit" /></TableCell>
                  <TableCell onClick={() => toggleSort('category')} sx={{ cursor: 'pointer', fontWeight: 600 }}>Category <SortIcon fontSize="inherit" /></TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell onClick={() => toggleSort('amount')} align="right" sx={{ cursor: 'pointer', fontWeight: 600 }}>Amount <SortIcon fontSize="inherit" /></TableCell>
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
                  filtered.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ color: 'text.secondary' }}>{t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell sx={{ maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description}>{t.description || 'N/A'}</TableCell>
                      <TableCell><Chip label={t.category} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={t.type === 'credit' ? 'Credit' : 'Debit'} size="small" color={t.type === 'credit' ? 'success' : 'error'} variant="outlined" /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: t.type === 'credit' ? 'success.main' : 'error.main' }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(t.signedAmount)}</TableCell>
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


