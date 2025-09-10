import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  OutlinedInput,
  Checkbox,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  Paper,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  GetApp as DownloadIcon,
  Sort as SortIcon,
  MenuOpen as MenuOpenIcon,
  Menu as MenuIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon
} from '@mui/icons-material';
import ApiService from '../services/api';

const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: 48 * 6.5,
      width: 240,
    },
  },
};

function normalizeTransaction(txn, documentId) {
  const rawAmount = parseFloat(
    txn.transaction_amount ?? txn.amount ?? 0
  );
  const date = txn.transaction_date ?? txn.date ?? null;
  const description = txn.transaction_description ?? txn.description ?? '';
  const type = txn.transaction_type ?? (rawAmount < 0 ? 'debit' : 'credit');
  let category = txn.category;
  if (category && typeof category === 'object') {
    category = category.value ?? category.name ?? 'other';
  }
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
    raw: txn,
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
  link.setAttribute('download', 'transactions.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const CombinedTransactionsDialog = ({ open, onClose, selectedDocumentIds }) => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!open) return;
      setLoading(true);
      try {
        let all = [];
        if (selectedDocumentIds.length > 1) {
          const res = await ApiService.getTransactionsBulk(selectedDocumentIds);
          const txns = (res.transactions ?? []).map(t => normalizeTransaction(t, t.document_id));
          all = txns;
        } else if (selectedDocumentIds.length === 1) {
          const id = selectedDocumentIds[0];
          const res = await ApiService.getDocumentTransactions(id);
          const txns = (res.transactions ?? []).map(t => normalizeTransaction(t, id));
          all = txns;
        }
        setTransactions(all);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDocumentIds.join('|')]);

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
        // date default
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
    <Dialog fullScreen open={open} onClose={onClose}>
      <AppBar sx={{ position: 'sticky' }} color="default" elevation={0}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Combined Transactions
          </Typography>
          <Chip label={`${filtered.length} rows`} size="small" sx={{ mr: 2 }} />
          <Chip label={`Credits ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.credits)}`} color="success" variant="outlined" size="small" sx={{ mr: 1 }} />
          <Chip label={`Debits ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.debits)}`} color="error" variant="outlined" size="small" sx={{ mr: 1 }} />
          <Chip label={`Net ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.net)}`} variant="outlined" size="small" sx={{ mr: 2 }} />
          <Tooltip title="Export CSV">
            <span>
              <IconButton onClick={() => exportToCsv(filtered)} disabled={filtered.length === 0}>
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Content area with left mini-drawer */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        {/* Left Drawer */}
        <Drawer
          variant="permanent"
          open={drawerOpen}
          sx={{
            width: drawerOpen ? 300 : 72,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerOpen ? 300 : 72,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider'
            },
          }}
        >
          <Toolbar sx={{ justifyContent: drawerOpen ? 'space-between' : 'center' }}>
            {drawerOpen && <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Transactions</Typography>}
            <IconButton size="small" onClick={() => setDrawerOpen(o => !o)}>
              {drawerOpen ? <MenuOpenIcon /> : <MenuIcon />}
            </IconButton>
          </Toolbar>
          <Divider />
          <List dense sx={{ overflowY: 'auto' }}>
            {filtered.slice(0, 500).map((t) => {
              const isDebit = t.type === 'debit';
              return (
                <ListItemButton
                  key={`nav-${t.id}`}
                  selected={selectedRowId === t.id}
                  onClick={() => {
                    setSelectedRowId(t.id);
                    // Try to scroll the row into view
                    const el = document.getElementById(`txn-row-${t.id}`);
                    if (el) el.scrollIntoView({ block: 'center' });
                  }}
                >
                  <ListItemIcon sx={{ minWidth: drawerOpen ? 40 : 'auto', color: isDebit ? 'error.main' : 'success.main' }}>
                    {isDebit ? <ArrowDownwardIcon fontSize="small" /> : <ArrowUpwardIcon fontSize="small" />}
                  </ListItemIcon>
                  {drawerOpen && (
                    <ListItemText
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                      primary={t.description || 'N/A'}
                      secondary={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(t.signedAmount)}
                    />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        </Drawer>

        {/* Right content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {/* Filters */}
          <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
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

            <ToggleButtonGroup
              size="small"
              value={typeFilter}
              exclusive
              onChange={(e, v) => v && setTypeFilter(v)}
            >
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
                      <TableCell onClick={() => toggleSort('category')} sx={{ cursor: 'pointer', fontWeight: 600 }}>Type</TableCell>
                      <TableCell onClick={() => toggleSort('amount')} align="right" sx={{ cursor: 'pointer', fontWeight: 600 }}>Amount <SortIcon fontSize="inherit" /></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Box sx={{ py: 6 }}>
                            <CircularProgress size={28} />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>No transactions match the filters.</TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((t) => (
                        <TableRow key={t.id} id={`txn-row-${t.id}`} hover selected={selectedRowId === t.id} onClick={() => setSelectedRowId(t.id)}>
                          <TableCell sx={{ color: 'text.secondary' }}>{t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell sx={{ maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description}>{t.description || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip label={t.category} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip label={t.type === 'credit' ? 'Credit' : 'Debit'} size="small" color={t.type === 'credit' ? 'success' : 'error'} variant="outlined" />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: t.type === 'credit' ? 'success.main' : 'error.main' }}>
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
      </Box>
    </Dialog>
  );
};

export default CombinedTransactionsDialog;


