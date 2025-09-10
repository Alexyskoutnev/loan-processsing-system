import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import ApiService from '../services/api';
import { Box, Card, CardHeader, CardContent, Typography, Chip, Stack, Button, CircularProgress, Paper, Alert, AlertTitle, LinearProgress } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Warning, CheckCircle, Error, TrendingUp, AccountBalance, Assessment } from '@mui/icons-material';

// Shared color map for bucket chart
const BUCKET_COLORS = {
  LIQUIDITY_MOVEMENT: '#64b5f6',
  OPERATING_EXPENSE: '#ffb74d',
  FINANCING: '#e57373',
  INCOME: '#81c784',
  OTHER: '#9575cd',
  DEFAULT: '#90a4ae',
};
const getBucketColor = (name) => BUCKET_COLORS[name] || BUCKET_COLORS.DEFAULT;
const toCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(typeof v === 'string' ? parseFloat(v) : (v || 0));

const DocumentInsights = () => {
  const { documentId } = useParams();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, [documentId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getDocumentInsights(documentId);
      setInsights(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => toCurrency(value);

  const getLoanRecommendation = (metrics) => {
    if (!metrics) return { status: 'INSUFFICIENT_DATA', reason: 'Insufficient data for analysis', severity: 'warning' };
    
    const income = parseFloat(metrics.monthly_income || 0);
    const cashFlow = parseFloat(metrics.net_cash_flow || 0);
    const dscr = metrics.dscr_existing;
    const redFlags = metrics.red_flags || {};
    const liquidityStats = metrics.liquidity || {};
    
    // Critical red flags
    const hasRedFlags = (
      (redFlags.gambling_crypto_hits || 0) > 0 ||
      (redFlags.chargebacks_count || 0) > 3 ||
      (liquidityStats.nsf_count || 0) > 5
    );
    
    if (hasRedFlags) {
      return {
        status: 'HIGH_RISK',
        reason: 'Critical red flags detected (gambling, excessive chargebacks, or NSF fees)',
        severity: 'error',
        factors: ['Red flags present']
      };
    }
    
    // Cash flow analysis
    if (cashFlow < 0) {
      return {
        status: 'HIGH_RISK',
        reason: 'Negative cash flow indicates inability to service additional debt',
        severity: 'error',
        factors: ['Negative cash flow']
      };
    }
    
    // DSCR analysis (if existing debt present)
    if (dscr !== null && dscr < 1.25) {
      return {
        status: 'HIGH_RISK',
        reason: `DSCR of ${dscr?.toFixed(2)} below minimum 1.25x requirement`,
        severity: 'error',
        factors: ['Low DSCR']
      };
    }
    
    // Income requirements
    if (income < 8000) {
      return {
        status: 'MODERATE_RISK',
        reason: 'Monthly income below preferred minimum of $8,000',
        severity: 'warning',
        factors: ['Low income']
      };
    }
    
    // Cash flow margin analysis
    const cashFlowMargin = income > 0 ? (cashFlow / income) * 100 : 0;
    
    if (cashFlowMargin > 25 && income > 10000) {
      return {
        status: 'LOW_RISK',
        reason: `Strong financial profile: ${cashFlowMargin.toFixed(1)}% cash flow margin`,
        severity: 'success',
        factors: ['Strong cash flow', 'Good income level']
      };
    }
    
    if (cashFlowMargin > 15) {
      return {
        status: 'MODERATE_RISK',
        reason: `Acceptable financial profile: ${cashFlowMargin.toFixed(1)}% cash flow margin`,
        severity: 'warning',
        factors: ['Adequate cash flow']
      };
    }
    
    return {
      status: 'MODERATE_RISK',
      reason: 'Financial profile requires additional review',
      severity: 'warning',
      factors: ['Requires review']
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', color: 'error.main', py: 4 }}>
            <Typography variant="h6">Error Loading Insights</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>{error}</Typography>
            <Button variant="contained" onClick={fetchInsights}>Try Again</Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!insights || !insights.insights) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6">No Analysis Available</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Unable to generate insights for this document.</Typography>
            <Button component={RouterLink} to="/documents" variant="outlined">Back to Documents</Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const metrics = insights.insights;
  const metadata = insights.document_metadata;
  const recommendation = getLoanRecommendation(metrics);

  return (
    <Box sx={{ p: 2 }}>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          title={<Typography variant="h5" sx={{ fontWeight: 600 }}>Financial Analysis</Typography>}
          subheader={`${metadata?.statement_name || `Document ${documentId.slice(0, 8)}`} • ${insights.transaction_count} transactions analyzed`}
          action={<Button component={RouterLink} to="/documents" variant="outlined">Back to Documents</Button>}
        />
      </Card>

      {/* Loan Recommendation Alert */}
      <Alert severity={recommendation.severity} sx={{ mb: 2 }}>
        <AlertTitle sx={{ fontWeight: 600 }}>
          Loan Recommendation: {recommendation.status.replace('_', ' ')}
        </AlertTitle>
        <Typography variant="body2">{recommendation.reason}</Typography>
        {recommendation.factors && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">Key Factors: {recommendation.factors.join(', ')}</Typography>
          </Box>
        )}
      </Alert>

      {/* Key Financial Metrics */}
      <Grid container spacing={2}>
        <Grid xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary">Monthly Income</Typography>
            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 600 }}>
              {formatCurrency(metrics.monthly_income)}
            </Typography>
          </Paper>
        </Grid>
        <Grid xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary">Monthly Expenses</Typography>
            <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 600 }}>
              {formatCurrency(metrics.monthly_expenses)}
            </Typography>
          </Paper>
        </Grid>
        <Grid xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary">Net Cash Flow</Typography>
            <Typography variant="h6" sx={{ color: (parseFloat(metrics.net_cash_flow || 0) < 0) ? 'error.main' : 'success.main', fontWeight: 600 }}>
              {formatCurrency(metrics.net_cash_flow)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {((parseFloat(metrics.net_cash_flow || 0) / parseFloat(metrics.monthly_income || 1)) * 100).toFixed(1)}% margin
            </Typography>
          </Paper>
        </Grid>
        <Grid xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary">DSCR</Typography>
            <Typography variant="h6" sx={{ 
              color: metrics.dscr_existing === null ? 'text.primary' : 
                     metrics.dscr_existing >= 1.25 ? 'success.main' : 'error.main',
              fontWeight: 600 
            }}>
              {metrics.dscr_existing === null ? 'N/A' : `${metrics.dscr_existing.toFixed(2)}x`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {metrics.dscr_existing === null ? 'No existing debt' : 
               metrics.dscr_existing >= 1.25 ? 'Strong coverage' : 'Below minimum'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {metadata && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardHeader title={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Statement Details</Typography>} />
          <CardContent>
            <Grid container spacing={2}>
              <Grid xs={12} md={4}>
                <Typography variant="overline" color="text.secondary">Period</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {metadata.period_start && metadata.period_end
                    ? `${new Date(metadata.period_start).toLocaleDateString()} - ${new Date(metadata.period_end).toLocaleDateString()}`
                    : 'N/A'}
                </Typography>
              </Grid>
              <Grid xs={12} md={4}>
                <Typography variant="overline" color="text.secondary">Opening Balance</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatCurrency(metadata.opening_balance)}</Typography>
              </Grid>
              <Grid xs={12} md={4}>
                <Typography variant="overline" color="text.secondary">Closing Balance</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatCurrency(metadata.closing_balance)}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Advanced Analytics Grid */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        
        {/* Cash Flow Trends */}
        <Grid xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader 
              title={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Cash Flow Trends</Typography>}
              avatar={<TrendingUp />}
            />
            <CardContent>
              {(() => {
                const monthlyData = metrics.monthly_rollup || [];
                if (!monthlyData.length) return <Typography variant="body2" color="text.secondary">No trend data available</Typography>;
                
                const maxAmount = Math.max(...monthlyData.map(m => Math.max(Math.abs(parseFloat(m.deposits || 0)), Math.abs(parseFloat(m.withdrawals || 0)))));
                
                return (
                  <Box>
                    {monthlyData.slice(-6).map((month, idx) => {
                      const deposits = parseFloat(month.deposits || 0);
                      const withdrawals = Math.abs(parseFloat(month.withdrawals || 0));
                      const net = parseFloat(month.net || 0);
                      
                      return (
                        <Box key={month.ym} sx={{ mb: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{month.ym}</Typography>
                            <Typography variant="body2" sx={{ color: net >= 0 ? 'success.main' : 'error.main' }}>
                              {formatCurrency(net)}
                            </Typography>
                          </Stack>
                          <Box sx={{ display: 'flex', gap: 1, height: 8 }}>
                            <Box sx={{ 
                              flex: deposits / maxAmount, 
                              bgcolor: 'success.light', 
                              borderRadius: 1,
                              minWidth: 2
                            }} />
                            <Box sx={{ 
                              flex: withdrawals / maxAmount, 
                              bgcolor: 'error.light', 
                              borderRadius: 1,
                              minWidth: 2
                            }} />
                          </Box>
                          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="success.main">+{formatCurrency(deposits)}</Typography>
                            <Typography variant="caption" color="error.main">-{formatCurrency(withdrawals)}</Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Box>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Risk Analysis */}
        <Grid xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader 
              title={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Risk Factors</Typography>}
              avatar={<Warning />}
            />
            <CardContent>
              {(() => {
                const redFlags = metrics.red_flags || {};
                const liquidityStats = metrics.liquidity || {};
                const risks = [];
                
                if ((redFlags.gambling_crypto_hits || 0) > 0) {
                  risks.push({ label: 'Gambling/Crypto Activity', value: redFlags.gambling_crypto_hits, severity: 'high' });
                }
                if ((redFlags.chargebacks_count || 0) > 0) {
                  risks.push({ label: 'Chargebacks', value: redFlags.chargebacks_count, severity: redFlags.chargebacks_count > 3 ? 'high' : 'medium' });
                }
                if ((redFlags.large_cash_withdrawals || 0) > 0) {
                  risks.push({ label: 'Large Cash Withdrawals', value: redFlags.large_cash_withdrawals, severity: 'medium' });
                }
                if ((liquidityStats.nsf_count || 0) > 0) {
                  risks.push({ label: 'NSF Occurrences', value: liquidityStats.nsf_count, severity: liquidityStats.nsf_count > 5 ? 'high' : 'medium' });
                }
                if ((liquidityStats.days_negative || 0) > 0) {
                  risks.push({ label: 'Days Negative Balance', value: liquidityStats.days_negative, severity: liquidityStats.days_negative > 10 ? 'high' : 'medium' });
                }
                
                if (risks.length === 0) {
                  return (
                    <Stack alignItems="center" spacing={1}>
                      <CheckCircle sx={{ color: 'success.main', fontSize: 32 }} />
                      <Typography variant="body2" color="success.main">No significant risk factors detected</Typography>
                    </Stack>
                  );
                }
                
                return (
                  <Stack spacing={1.5}>
                    {risks.map((risk, idx) => (
                      <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Error sx={{ 
                            color: risk.severity === 'high' ? 'error.main' : 'warning.main', 
                            fontSize: 16 
                          }} />
                          <Typography variant="body2">{risk.label}</Typography>
                        </Stack>
                        <Chip 
                          label={risk.value} 
                          size="small" 
                          color={risk.severity === 'high' ? 'error' : 'warning'}
                        />
                      </Stack>
                    ))}
                  </Stack>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recurring Bills Analysis */}
        <Grid xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader 
              title={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Recurring Bills</Typography>}
              avatar={<AccountBalance />}
            />
            <CardContent>
              {(() => {
                const bills = metrics.recurring_bills || [];
                if (!bills.length) return <Typography variant="body2" color="text.secondary">No recurring bills detected</Typography>;
                
                const sortedBills = bills.sort((a, b) => parseFloat(b.avg_amount || 0) - parseFloat(a.avg_amount || 0)).slice(0, 8);
                
                return (
                  <Stack spacing={1}>
                    {sortedBills.map((bill, idx) => (
                      <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{bill.merchant}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {bill.cadence} • {bill.count} payments • {(bill.confidence * 100).toFixed(0)}% confidence
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(bill.avg_amount)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Existing Debt Signals */}
        <Grid xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader 
              title={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Existing Debt</Typography>}
              avatar={<Assessment />}
            />
            <CardContent>
              {(() => {
                const loanSignals = metrics.loan_signals || [];
                const existingDebtService = parseFloat(metrics.existing_debt_service || 0);
                
                if (!loanSignals.length && existingDebtService === 0) {
                  return (
                    <Stack alignItems="center" spacing={1}>
                      <CheckCircle sx={{ color: 'success.main', fontSize: 32 }} />
                      <Typography variant="body2" color="success.main">No existing debt payments detected</Typography>
                    </Stack>
                  );
                }
                
                return (
                  <Stack spacing={2}>
                    {existingDebtService > 0 && (
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.light' }}>
                        <Typography variant="overline" color="text.secondary">Total Monthly Debt Service</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {formatCurrency(existingDebtService)}
                        </Typography>
                      </Paper>
                    )}
                    
                    {loanSignals.length > 0 && (
                      <Stack spacing={1}>
                        <Typography variant="subtitle2">Detected Loan Payments:</Typography>
                        {loanSignals.slice(0, 5).map((loan, idx) => (
                          <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{loan.lender}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {loan.cadence} • {loan.count} payments
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCurrency(loan.avg_payment)}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Transaction Category Mix */}
        <Grid xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Transaction Categories</Typography>} />
            <CardContent>
              {(() => {
                const breakdowns = metrics.bucket_breakdown || [];
                if (!breakdowns.length) return <Typography variant="body2" color="text.secondary">No category data</Typography>;
                
                const segments = (() => {
                  const totalsByBucket = {}; let overall = 0;
                  for (const b of breakdowns) { 
                    const name = b.bucket || 'OTHER'; 
                    const amt = typeof b.total_amount === 'string' ? parseFloat(b.total_amount) : (b.total_amount || 0); 
                    totalsByBucket[name] = (totalsByBucket[name] || 0) + amt; 
                    overall += amt; 
                  }
                  return Object.entries(totalsByBucket)
                    .map(([bucket, amount]) => ({ bucket, pct: (amount / overall) * 100, amount }))
                    .sort((a,b)=>b.pct-a.pct);
                })();
                
                return (
                  <Stack spacing={1.5}>
                    {segments.map(seg => (
                      <Box key={seg.bucket}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: getBucketColor(seg.bucket) }} />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{seg.bucket}</Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {seg.pct.toFixed(1)}% • {formatCurrency(seg.amount)}
                          </Typography>
                        </Stack>
                        <LinearProgress 
                          variant="determinate" 
                          value={seg.pct} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 1,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getBucketColor(seg.bucket)
                            }
                          }} 
                        />
                      </Box>
                    ))}
                  </Stack>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Business Insights */}
        <Grid xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Business Insights</Typography>} />
            <CardContent>
              {(() => {
                const processorMix = metrics.processor_mix || {};
                const stability = metrics.stability || {};
                const cashFlowMargin = ((parseFloat(metrics.net_cash_flow || 0) / parseFloat(metrics.monthly_income || 1)) * 100);
                
                return (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="overline" color="text.secondary">Income Stability</Typography>
                      <Typography variant="body2">
                        Coefficient of variation: {((stability.deposit_cv || 0) * 100).toFixed(1)}%
                        {stability.deposit_cv < 0.3 ? ' (Stable)' : stability.deposit_cv < 0.5 ? ' (Moderate)' : ' (Volatile)'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="overline" color="text.secondary">Payment Methods</Typography>
                      <Typography variant="body2">
                        Card settlements: {formatCurrency(processorMix.card_settlements || 0)}
                      </Typography>
                      <Typography variant="body2">
                        ACH/Wires: {formatCurrency(processorMix.ach_wires || 0)}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="overline" color="text.secondary">Cash Flow Health</Typography>
                      <Typography variant="body2" sx={{ 
                        color: cashFlowMargin > 20 ? 'success.main' : cashFlowMargin > 10 ? 'warning.main' : 'error.main'
                      }}>
                        {cashFlowMargin.toFixed(1)}% margin - 
                        {cashFlowMargin > 20 ? 'Excellent' : cashFlowMargin > 10 ? 'Good' : 'Concerning'}
                      </Typography>
                    </Box>
                    
                    {stability.unique_payers && (
                      <Box>
                        <Typography variant="overline" color="text.secondary">Customer Diversity</Typography>
                        <Typography variant="body2">
                          {stability.unique_payers} unique payers • Top payer: {((stability.top_payer_share || 0) * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>
        
      </Grid>
    </Box>
  );
};

export default DocumentInsights;