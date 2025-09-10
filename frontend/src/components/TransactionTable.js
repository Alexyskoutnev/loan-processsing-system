import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Typography, CircularProgress } from '@mui/material';

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
    <Paper variant="outlined">
      <Box sx={{ p: 2, pb: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Transactions ({rows.length})</Typography>
        <Typography variant="body2" color="text.secondary">Extracted and categorized transactions from the bank statement</Typography>
      </Box>
      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ color: 'text.secondary' }}>{r.date ? new Date(r.date).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description}>{r.description || 'N/A'}</TableCell>
                <TableCell>
                  <Chip label={String(r.category)} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.type === 'credit' ? 'Credit' : 'Debit'}
                    size="small"
                    color={r.type === 'credit' ? 'success' : 'error'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: r.type === 'credit' ? 'success.main' : 'error.main' }}>
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