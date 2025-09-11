import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Chip, Tooltip, IconButton, CircularProgress, Card, CardContent, CardHeader, Grid, Stack, LinearProgress, Alert, AlertTitle, Tabs, Tab } from '@mui/material';
import { GetApp as DownloadIcon, TrendingUp, AccountBalance, Assessment, Warning, CheckCircle, Error, PieChart, AttachMoney, MoneyOff, TrendingDown, Security } from '@mui/icons-material';
import ApiService from '../services/api';

// Colors and user-friendly names for bucket analysis
const BUCKET_COLORS = {
  LIQUIDITY_MOVEMENT: '#64b5f6',
  OPERATING_EXPENSE: '#ffb74d', 
  DISCRETIONARY_EXPENSE: '#ff9800',
  FINANCING: '#e57373',
  INCOME: '#81c784',
  TAXES: '#9c27b0',
  CAPITAL: '#795548',
  FEES_INTEREST: '#f44336',
  OTHER: '#9575cd',
  DEFAULT: '#90a4ae',
};

const BUCKET_DISPLAY_NAMES = {
  LIQUIDITY_MOVEMENT: 'Transfers & Liquidity',
  OPERATING_EXPENSE: 'Operating Expenses', 
  DISCRETIONARY_EXPENSE: 'Discretionary Spending',
  FINANCING: 'Financing & Debt',
  INCOME: 'Income & Revenue',
  TAXES: 'Tax Payments',
  CAPITAL: 'Capital Investments',
  FEES_INTEREST: 'Fees & Interest',
  OTHER: 'Other Transactions',
};

const getBucketColor = (name) => BUCKET_COLORS[name] || BUCKET_COLORS.DEFAULT;
const getBucketDisplayName = (name) => BUCKET_DISPLAY_NAMES[name] || name;

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

// Aggregate metrics across multiple documents
function aggregateMetrics(allInsights) {
  if (!allInsights.length) return null;
  
  const totals = {
    monthly_income: 0,
    monthly_expenses: 0,
    net_cash_flow: 0,
    existing_debt_service: 0,
    transaction_count: 0,
    avg_daily_balance: 0,
    nsf_count: 0,
    nsf_fees: 0,
    days_negative: 0,
    recurring_bills: [],
    loan_signals: [],
    red_flags: {
      chargebacks_count: 0,
      gambling_crypto_hits: 0,
      large_cash_withdrawals: 0,
      round_number_cash_deposits: 0
    }
  };
  
  let validCount = 0;
  
  allInsights.forEach(insight => {
    if (!insight) return;
    validCount++;
    
    totals.monthly_income += parseFloat(insight.monthly_income || 0);
    totals.monthly_expenses += parseFloat(insight.monthly_expenses || 0);
    totals.net_cash_flow += parseFloat(insight.net_cash_flow || 0);
    totals.existing_debt_service += parseFloat(insight.existing_debt_service || 0);
    totals.transaction_count += parseInt(insight.transaction_count || 0);
    
    if (insight.liquidity) {
      totals.avg_daily_balance += parseFloat(insight.liquidity.avg_daily_balance || 0);
      totals.nsf_count += parseInt(insight.liquidity.nsf_count || 0);
      totals.nsf_fees += parseFloat(insight.liquidity.nsf_fees || 0);
      totals.days_negative += parseInt(insight.liquidity.days_negative || 0);
    }
    
    if (insight.recurring_bills) {
      totals.recurring_bills.push(...insight.recurring_bills);
    }
    
    if (insight.loan_signals) {
      totals.loan_signals.push(...insight.loan_signals);
    }
    
    if (insight.red_flags) {
      totals.red_flags.chargebacks_count += parseInt(insight.red_flags.chargebacks_count || 0);
      totals.red_flags.gambling_crypto_hits += parseInt(insight.red_flags.gambling_crypto_hits || 0);
      totals.red_flags.large_cash_withdrawals += parseInt(insight.red_flags.large_cash_withdrawals || 0);
      totals.red_flags.round_number_cash_deposits += parseInt(insight.red_flags.round_number_cash_deposits || 0);
    }
  });
  
  if (validCount > 0) {
    totals.avg_daily_balance = totals.avg_daily_balance / validCount;
  }
  
  // Calculate derived metrics
  totals.cash_flow_margin = totals.monthly_income > 0 ? (totals.net_cash_flow / totals.monthly_income) * 100 : 0;
  totals.dscr_existing = totals.existing_debt_service > 0 ? totals.net_cash_flow / totals.existing_debt_service : null;
  
  return totals;
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
  const [detailedInsights, setDetailedInsights] = useState([]);
  const [aggregatedMetrics, setAggregatedMetrics] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);

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
                  .map(b => `${getBucketDisplayName(b.bucket)}: ${Number(b.pct_of_total ?? b.percentage ?? 0).toFixed(1)}%`)
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
          
          // Store detailed insights for advanced analysis
          const detailedData = (bulk.results || [])
            .filter(r => r.success && r.insights)
            .map(r => ({
              documentId: r.document_id,
              insights: r.insights,
              metadata: r.document_metadata
            }));
          setDetailedInsights(detailedData);
          
          // Aggregate metrics across all documents
          const aggregated = aggregateMetrics(detailedData.map(d => d.insights));
          setAggregatedMetrics(aggregated);
          
          const allBreakdowns = detailedData.flatMap(d => d.insights.bucket_breakdown || []);
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
                  .map(b => `${getBucketDisplayName(b.bucket)}: ${Number(b.pct_of_total ?? b.percentage ?? 0).toFixed(1)}%`)
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
            
            // Store detailed insights for single document
            setDetailedInsights([{
              documentId: id,
              insights: data.insights,
              metadata: data.document_metadata
            }]);
            setAggregatedMetrics(data.insights);
            
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
          {/* Apple-Style Tabbed Interface */}
          <Paper 
            variant="outlined"
            sx={{ 
              borderRadius: 4,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
              mb: 3
            }}
          >
            {/* Tab Navigation */}
            <Box sx={{ 
              borderBottom: '1px solid #e5e7eb',
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(20px)',
              px: 2
            }}>
              <Tabs 
                value={selectedTab} 
                onChange={(e, newValue) => setSelectedTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    minHeight: 56,
                    px: 3,
                    '&.Mui-selected': {
                      color: '#2563eb',
                      fontWeight: 700
                    }
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#2563eb',
                    height: 3,
                    borderRadius: '2px 2px 0 0'
                  }
                }}
              >
                <Tab icon={<PieChart />} iconPosition="start" label="Risk Categories" />
                <Tab icon={<AttachMoney />} iconPosition="start" label="Monthly Income" />
                <Tab icon={<MoneyOff />} iconPosition="start" label="Monthly Expenses" />
                <Tab icon={<TrendingUp />} iconPosition="start" label="Cash Flow" />
                <Tab icon={<Security />} iconPosition="start" label="Risk Factors" />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ minHeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Tab 0: Risk Categories */}
              {selectedTab === 0 && bucketSegments.length > 0 && (
                <Box sx={{ p: 6, width: '100%', maxWidth: 1200 }}>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 800, 
                    mb: 6, 
                    textAlign: 'center', 
                    color: '#1e293b',
                    letterSpacing: '-0.025em'
                  }}>
                    Risk Category Distribution
                  </Typography>
                  <Grid container spacing={6} alignItems="center" justifyContent="center">
                    {/* Large Chart */}
                    <Grid xs={12} lg={6}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box
                          sx={{
                            width: { xs: 280, sm: 340, md: 380 },
                            height: { xs: 280, sm: 340, md: 380 },
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
                            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                            border: '12px solid white',
                            position: 'relative',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '30%',
                              height: '30%',
                              backgroundColor: 'white',
                              borderRadius: '50%',
                              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1)'
                            }
                          }}
                        />
                      </Box>
                    </Grid>
                    
                    {/* Legend */}
                    <Grid xs={12} lg={6}>
                      <Box sx={{ display: 'grid', gap: 3, maxWidth: 400, mx: 'auto' }}>
                        {bucketSegments.map((seg) => (
                          <Paper 
                            key={seg.bucket} 
                            elevation={0}
                            sx={{ 
                              p: 3, 
                              borderRadius: 3,
                              background: 'rgba(255,255,255,0.8)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              '&:hover': {
                                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                transform: 'translateY(-2px)',
                                background: 'rgba(255,255,255,0.95)'
                              },
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                                <Box sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: 2, 
                                  bgcolor: getBucketColor(seg.bucket),
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                }} />
                                <Typography variant="body1" sx={{ 
                                  fontWeight: 600, 
                                  color: '#334155',
                                  fontSize: '0.95rem'
                                }}>
                                  {getBucketDisplayName(seg.bucket)}
                                </Typography>
                              </Box>
                              <Typography variant="h6" sx={{ 
                                fontWeight: 800, 
                                color: '#0f172a',
                                fontSize: '1.1rem'
                              }}>
                                {seg.pct.toFixed(1)}%
                              </Typography>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Tab 1: Monthly Income */}
              {selectedTab === 1 && aggregatedMetrics && (
                <Box sx={{ p: 6, width: '100%', textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 800, 
                    mb: 6, 
                    color: '#1e293b',
                    letterSpacing: '-0.025em'
                  }}>
                    Monthly Income Analysis
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <Box sx={{
                      width: 300,
                      height: 300,
                      borderRadius: '50%',
                      background: 'conic-gradient(from 0deg, #10b981 0%, #34d399 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 20px 60px rgba(16, 185, 129, 0.3)',
                      border: '12px solid white',
                      position: 'relative'
                    }}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        color: 'white',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <AttachMoney sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
                          {toCurrency(aggregatedMetrics.monthly_income)}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, opacity: 0.9 }}>
                          Monthly Income
                        </Typography>
                      </Box>
                    </Box>
          
                  </Box>
                </Box>
              )}

              {/* Tab 2: Monthly Expenses */}
              {selectedTab === 2 && aggregatedMetrics && (
                <Box sx={{ p: 6, width: '100%', textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 800, 
                    mb: 6, 
                    color: '#1e293b',
                    letterSpacing: '-0.025em'
                  }}>
                    Monthly Expenses Breakdown
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <Box sx={{
                      width: 300,
                      height: 300,
                      borderRadius: '50%',
                      background: 'conic-gradient(from 0deg, #ef4444 0%, #f87171 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 20px 60px rgba(239, 68, 68, 0.3)',
                      border: '12px solid white',
                      position: 'relative'
                    }}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        color: 'white',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <MoneyOff sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
                          {toCurrency(aggregatedMetrics.monthly_expenses)}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, opacity: 0.9 }}>
                          Monthly Expenses
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Tab 3: Cash Flow */}
              {selectedTab === 3 && aggregatedMetrics && (
                <Box sx={{ p: 6, width: '100%', textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 800, 
                    mb: 6, 
                    color: '#1e293b',
                    letterSpacing: '-0.025em'
                  }}>
                    Net Cash Flow Analysis
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <Box sx={{
                      width: 300,
                      height: 300,
                      borderRadius: '50%',
                      background: aggregatedMetrics.net_cash_flow >= 0 
                        ? 'conic-gradient(from 0deg, #3b82f6 0%, #60a5fa 100%)'
                        : 'conic-gradient(from 0deg, #f59e0b 0%, #fbbf24 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: aggregatedMetrics.net_cash_flow >= 0
                        ? '0 20px 60px rgba(59, 130, 246, 0.3)'
                        : '0 20px 60px rgba(245, 158, 11, 0.3)',
                      border: '12px solid white',
                      position: 'relative'
                    }}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        color: 'white',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        {aggregatedMetrics.net_cash_flow >= 0 ? (
                          <TrendingUp sx={{ fontSize: 48, mb: 1 }} />
                        ) : (
                          <TrendingDown sx={{ fontSize: 48, mb: 1 }} />
                        )}
                        <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
                          {toCurrency(aggregatedMetrics.net_cash_flow)}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, opacity: 0.9 }}>
                          Net Cash Flow
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 1 }}>
                          {aggregatedMetrics.cash_flow_margin.toFixed(1)}% margin
                        </Typography>
                      </Box>
                    </Box>
                  
                  </Box>
                </Box>
              )}

              {/* Tab 4: Risk Factors */}
              {selectedTab === 4 && aggregatedMetrics && (
                <Box sx={{ p: 6, width: '100%', textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 800, 
                    mb: 6, 
                    color: '#1e293b',
                    letterSpacing: '-0.025em'
                  }}>
                    Risk Factor Assessment
                  </Typography>
                  <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                    {(() => {
                      const redFlags = aggregatedMetrics.red_flags || {};
                      const risks = [];
                      
                      if ((redFlags.gambling_crypto_hits || 0) > 0) {
                        risks.push({ 
                          label: 'Gambling/Crypto Activity', 
                          value: redFlags.gambling_crypto_hits, 
                          severity: 'high',
                          color: '#ef4444'
                        });
                      }
                      if ((redFlags.chargebacks_count || 0) > 0) {
                        risks.push({ 
                          label: 'Chargebacks', 
                          value: redFlags.chargebacks_count, 
                          severity: redFlags.chargebacks_count > 3 ? 'high' : 'medium',
                          color: redFlags.chargebacks_count > 3 ? '#ef4444' : '#f59e0b'
                        });
                      }
                      if ((redFlags.large_cash_withdrawals || 0) > 0) {
                        risks.push({ 
                          label: 'Large Cash Withdrawals', 
                          value: redFlags.large_cash_withdrawals, 
                          severity: 'medium',
                          color: '#f59e0b'
                        });
                      }
                      if ((aggregatedMetrics.nsf_count || 0) > 0) {
                        risks.push({ 
                          label: 'NSF Occurrences', 
                          value: aggregatedMetrics.nsf_count, 
                          severity: aggregatedMetrics.nsf_count > 5 ? 'high' : 'medium',
                          color: aggregatedMetrics.nsf_count > 5 ? '#ef4444' : '#f59e0b'
                        });
                      }
                      if ((aggregatedMetrics.days_negative || 0) > 0) {
                        risks.push({ 
                          label: 'Days Negative Balance', 
                          value: aggregatedMetrics.days_negative, 
                          severity: aggregatedMetrics.days_negative > 10 ? 'high' : 'medium',
                          color: aggregatedMetrics.days_negative > 10 ? '#ef4444' : '#f59e0b'
                        });
                      }
                      
                      if (risks.length === 0) {
                        return (
                          <Box sx={{ py: 8 }}>
                            <CheckCircle sx={{ 
                              color: '#10b981', 
                              fontSize: 80, 
                              mb: 3,
                              filter: 'drop-shadow(0 4px 20px rgba(16, 185, 129, 0.3))'
                            }} />
                            <Typography variant="h5" sx={{ 
                              color: '#10b981', 
                              fontWeight: 700, 
                              mb: 2 
                            }}>
                              No Significant Risk Factors
                            </Typography>
                            
                          </Box>
                        );
                      }
                      
                      return (
                        <Stack spacing={3}>
                          <Typography variant="h6" sx={{ mb: 2, color: '#64748b' }}>
                            Detected Risk Factors
                          </Typography>
                          {risks.map((risk, idx) => (
                            <Paper 
                              key={idx}
                              elevation={0}
                              sx={{ 
                                p: 4, 
                                borderRadius: 3,
                                background: 'rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(10px)',
                                border: `2px solid ${risk.color}20`,
                                '&:hover': {
                                  boxShadow: `0 8px 32px ${risk.color}30`,
                                  transform: 'translateY(-2px)'
                                },
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Box sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    backgroundColor: `${risk.color}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Error sx={{ 
                                      color: risk.color, 
                                      fontSize: 24 
                                    }} />
                                  </Box>
                                  <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                      {risk.label}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Severity: {risk.severity.toUpperCase()}
                                    </Typography>
                                  </Box>
                                </Stack>
                                <Box sx={{ 
                                  backgroundColor: risk.color,
                                  color: 'white',
                                  px: 3,
                                  py: 1,
                                  borderRadius: 2,
                                  fontWeight: 700,
                                  fontSize: '1.1rem'
                                }}>
                                  {risk.value}
                                </Box>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      );
                    })()}
                  </Box>
                </Box>
              )}

              {/* Empty state when no data */}
              {((selectedTab === 0 && bucketSegments.length === 0) || 
                (selectedTab > 0 && !aggregatedMetrics)) && (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No Data Available
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please select documents with available insights to view this visualization.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          <Paper 
            variant="outlined"
            sx={{ 
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}
          >
            <Box sx={{ p: 3, background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Risk View
              </Typography>
              
            </Box>
            
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow sx={{ 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderBottom: '2px solid #e2e8f0'
                  }}>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: '#374151', 
                      fontSize: '0.875rem',
                      py: 2.5
                    }}>Document</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: '#374151', 
                      fontSize: '0.875rem',
                      py: 2.5
                    }}>Transactions</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: '#374151', 
                      fontSize: '0.875rem',
                      py: 2.5
                    }}>Monthly Income</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: '#374151', 
                      fontSize: '0.875rem',
                      py: 2.5
                    }}>Monthly Expenses</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: '#374151', 
                      fontSize: '0.875rem',
                      py: 2.5
                    }}>Net Cash Flow</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: '#374151', 
                      fontSize: '0.875rem',
                      py: 2.5
                    }}>Top Categories</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: '#374151', 
                      fontSize: '0.875rem',
                      py: 2.5
                    }}>Risk Level</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: '#374151', 
                      fontSize: '0.875rem',
                      py: 2.5
                    }}>Assessment</TableCell>
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
                  rows.map((r, index) => (
                    <TableRow 
                      key={r.documentId} 
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
                        fontWeight: 600, 
                        color: '#1e293b',
                        py: 2.5
                      }}>
                        {r.statementName || `Doc ${r.documentId.slice(0, 8)}...`}
                      </TableCell>
                      <TableCell sx={{ 
                        color: '#64748b',
                        fontWeight: 500,
                        py: 2.5
                      }}>
                        {r.transactionCount}
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#059669',
                        py: 2.5
                      }}>
                        {r.income}
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#dc2626',
                        py: 2.5
                      }}>
                        {r.expenses}
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 700,
                        color: r.netCashFlow.includes('-') ? '#dc2626' : '#059669',
                        py: 2.5
                      }}>
                        {r.netCashFlow}
                      </TableCell>
                      <TableCell sx={{ py: 2.5 }}>
                        {(r.buckets && r.buckets.length > 0) ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {r.buckets.map((b, i) => (
                              <Chip 
                                key={i} 
                                label={b} 
                                size="small" 
                                variant="outlined"
                                sx={{ 
                                  fontSize: '0.75rem',
                                  height: 24,
                                  borderRadius: 1.5,
                                  fontWeight: 500
                                }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 2.5 }}>
                        <Chip 
                          label={r.risk} 
                          color={r.riskColor} 
                          variant="filled" 
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 28,
                            borderRadius: 2
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        color: '#64748b',
                        fontWeight: 500,
                        py: 2.5,
                        maxWidth: 200
                      }}>
                        {r.reason}
                      </TableCell>
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


