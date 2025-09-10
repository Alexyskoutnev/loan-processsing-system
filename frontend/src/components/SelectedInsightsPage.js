import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Chip, Tooltip, IconButton, CircularProgress } from '@mui/material';
import { GetApp as DownloadIcon } from '@mui/icons-material';
import ApiService from '../services/api';

// Colors for bucket pie chart
const BUCKET_COLORS = {
  LIQUIDITY_MOVEMENT: '#64b5f6',
  OPERATING_EXPENSE: '#ffb74d',
  FINANCING: '#e57373',
  INCOME: '#81c784',
  OTHER: '#9575cd',
  DEFAULT: '#90a4ae',
};

const getBucketColor = (name) => BUCKET_COLORS[name] || BUCKET_COLORS.DEFAULT;

function getRisk(insights) {
  if (!insights) return { label: 'INSUFFICIENT', color: 'default', reason: 'No insights' };
  const income = parseFloat(insights.monthly_income || 0);
  const expenses = parseFloat(insights.monthly_expenses || 0);
  const cashFlow = parseFloat(insights.net_cash_flow || 0);
  if (income < 5000) return { label: 'HIGH', color: 'error', reason: 'Low monthly income' };
  if (cashFlow < 0) return { label: 'HIGH', color: 'error', reason: 'Negative cash flow' };
  if (cashFlow < income * 0.1) return { label: 'MODERATE', color: 'warning', reason: 'Low cash flow margin' };
  if (cashFlow > income * 0.2) return { label: 'LOW', color: 'success', reason: 'Strong cash flow' };
  return { label: 'MODERATE', color: 'warning', reason: 'Adequate cash flow' };
}

function toCurrency(v) {
  const n = typeof v === 'string' ? parseFloat(v) : (v || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function buildSegmentsFromBreakdowns(breakdowns = []) {
  const totalsByBucket = {};
  let overall = 0;
  for (const b of breakdowns) {
    const bucket = b?.bucket || 'OTHER';
    const amount = typeof b?.total_amount === 'string' ? parseFloat(b.total_amount) : (b?.total_amount || 0);
    totalsByBucket[bucket] = (totalsByBucket[bucket] || 0) + amount;
    overall += amount;
  }
  if (overall <= 0) return [];
  const segments = Object.entries(totalsByBucket)
    .map(([bucket, amount]) => ({ bucket, pct: (amount / overall) * 100 }))
    .sort((a, b) => b.pct - a.pct);
  return segments;
}

function exportCsv(rows) {
  const header = ['Document ID', 'Statement', 'Transactions', 'Income', 'Expenses', 'Net Cash Flow', 'Risk', 'Buckets', 'Reason'];
  const lines = [header.join(',')].concat(rows.map(r => [
    r.documentId,
    JSON.stringify(r.statementName || ''),
    r.transactionCount,
    r.income,
    r.expenses,
    r.netCashFlow,
    r.risk,
    JSON.stringify((r.buckets || []).join(' | ')),
    JSON.stringify(r.reason || '')
  ].join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'selected-insights.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const SelectedInsightsPage = ({ selectedIds = [] }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bucketSegments, setBucketSegments] = useState([]);
  const [chartTitle, setChartTitle] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!selectedIds || selectedIds.length === 0) { setRows([]); return; }
      setLoading(true);
      try {
        if (selectedIds.length > 1) {
          const bulk = await ApiService.getInsightsBulk(selectedIds);
          const results = (bulk.results || []).map((item) => {
            if (!item.success || !item.insights) {
              return {
                documentId: item.document_id,
                statementName: item.document_metadata?.statement_name || '',
                transactionCount: item.transaction_count || 0,
                income: toCurrency(0),
                expenses: toCurrency(0),
                netCashFlow: toCurrency(0),
                risk: 'INSUFFICIENT',
                riskColor: 'default',
                buckets: [],
                reason: item.error || 'No insights',
              };
            }
            const r = getRisk(item.insights);
            const topBuckets = Array.isArray(item.insights.bucket_breakdown)
              ? item.insights.bucket_breakdown
                  .slice(0, 3)
                  .map(b => `${b.bucket}: ${Number(b.pct_of_total ?? b.percentage ?? 0).toFixed(1)}%`)
              : [];
            return {
              documentId: item.document_id,
              statementName: item.document_metadata?.statement_name || '',
              transactionCount: item.transaction_count || 0,
              income: toCurrency(item.insights?.monthly_income),
              expenses: toCurrency(item.insights?.monthly_expenses),
              netCashFlow: toCurrency(item.insights?.net_cash_flow),
              risk: r.label,
              riskColor: r.color,
              buckets: topBuckets,
              reason: r.reason,
            };
          });
          setRows(results);
          const allBreakdowns = (bulk.results || [])
            .filter(r => r.success && Array.isArray(r?.insights?.bucket_breakdown))
            .flatMap(r => r.insights.bucket_breakdown || []);
          const segments = buildSegmentsFromBreakdowns(allBreakdowns);
          setBucketSegments(segments);
          setChartTitle('Risk Category Mix (Aggregated)');
        } else {
          const id = selectedIds[0];
          try {
            const data = await ApiService.getDocumentInsights(id);
            const r = getRisk(data.insights);
            const topBuckets = Array.isArray(data?.insights?.bucket_breakdown)
              ? data.insights.bucket_breakdown
                  .slice(0, 3)
                  .map(b => `${b.bucket}: ${Number(b.pct_of_total ?? b.percentage ?? 0).toFixed(1)}%`)
              : [];
            setRows([{
              documentId: id,
              statementName: data.document_metadata?.statement_name || '',
              transactionCount: data.transaction_count || 0,
              income: toCurrency(data.insights?.monthly_income),
              expenses: toCurrency(data.insights?.monthly_expenses),
              netCashFlow: toCurrency(data.insights?.net_cash_flow),
              risk: r.label,
              riskColor: r.color,
              buckets: topBuckets,
              reason: r.reason,
            }]);
            const segments = buildSegmentsFromBreakdowns(data?.insights?.bucket_breakdown || []);
            setBucketSegments(segments);
            setChartTitle('Risk Category Mix');
          } catch (e) {
            // Fallback per earlier logic
            try {
              const tx = await ApiService.getDocumentTransactions(id);
              let credits = 0, debits = 0;
              for (const t of (tx.transactions || [])) {
                const rawAmount = parseFloat(t.transaction_amount ?? t.amount ?? 0);
                const type = t.transaction_type ?? (rawAmount < 0 ? 'debit' : 'credit');
                const mag = Math.abs(rawAmount);
                if (type === 'credit') credits += mag; else debits += mag;
              }
              const net = credits - debits;
              const fallback = { monthly_income: credits, monthly_expenses: debits, net_cash_flow: net };
              const r = getRisk(fallback);
              setRows([{ documentId: id, statementName: '', transactionCount: (tx.transactions || []).length, income: toCurrency(credits), expenses: toCurrency(debits), netCashFlow: toCurrency(net), risk: r.label, riskColor: r.color, buckets: [], reason: 'Derived from transactions (insights unavailable)' }]);
              setBucketSegments([]);
              setChartTitle('');
            } catch (e2) {
              setRows([{ documentId: id, statementName: '', transactionCount: 0, income: '$0.00', expenses: '$0.00', netCashFlow: '$0.00', risk: 'ERROR', riskColor: 'default', buckets: [], reason: e.message || 'Failed to fetch insights' }]);
              setBucketSegments([]);
              setChartTitle('');
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedIds?.join('|')]);

  const hasSelection = selectedIds && selectedIds.length > 0;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>Insights</Typography>
        <Tooltip title="Export CSV">
          <span>
            <IconButton onClick={() => exportCsv(rows)} disabled={rows.length === 0}>
              <DownloadIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {!hasSelection && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          Select one or more documents to view loan risk insights.
        </Paper>
      )}

      {hasSelection && (
        <>
          {bucketSegments.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>{chartTitle}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box
                  sx={{
                    width: 180,
                    height: 180,
                    borderRadius: '50%',
                    background: (() => {
                      let acc = 0;
                      const parts = bucketSegments.map(seg => {
                        const start = acc;
                        const end = acc + seg.pct;
                        acc = end;
                        return `${getBucketColor(seg.bucket)} ${start}% ${end}%`;
                      });
                      if (acc < 100) parts.push(`${BUCKET_COLORS.DEFAULT} ${acc}% 100%`);
                      return `conic-gradient(${parts.join(', ')})`;
                    })(),
                  }}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: 1.5 }}>
                  {bucketSegments.map((seg) => (
                    <Box key={seg.bucket} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: getBucketColor(seg.bucket) }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{seg.bucket}</Typography>
                      <Typography variant="body2" color="text.secondary">{seg.pct.toFixed(1)}%</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Paper>
          )}

          <Paper variant="outlined">
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Document</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Transactions</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Monthly Income</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Monthly Expenses</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Net Cash Flow</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Bucket Mix</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Risk</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Box sx={{ py: 6 }}>
                        <CircularProgress size={24} />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ color: 'text.secondary' }}>No insights available.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.documentId} hover>
                      <TableCell>{r.statementName || r.documentId.slice(0, 8)}</TableCell>
                      <TableCell>{r.transactionCount}</TableCell>
                      <TableCell>{r.income}</TableCell>
                      <TableCell>{r.expenses}</TableCell>
                      <TableCell>{r.netCashFlow}</TableCell>
                      <TableCell>
                        {(r.buckets && r.buckets.length > 0) ? (
                          r.buckets.map((b, i) => (
                            <Chip key={i} label={b} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip label={r.risk} color={r.riskColor} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>{r.reason}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        </>
      )}
    </Box>
  );
};

export default SelectedInsightsPage;


