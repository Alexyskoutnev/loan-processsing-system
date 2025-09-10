import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../services/api';
import { Box, Card, CardContent, CardHeader, Typography, Grid, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Divider } from '@mui/material';

const DocumentDetail = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (documentId) {
      fetchDocumentDetails();
    }
  }, [documentId]);

  const fetchDocumentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ApiService.getDocumentDetails(documentId);
      // Normalize backend shape (result is the document payload itself)
      const normalized = {
        document_id: result.document_id || documentId,
        statement_name: (result.metadata && result.metadata.statement_name) || result.statement_name || result.filename || 'Bank Statement',
        opening_balance: result.metadata && result.metadata.opening_balance,
        closing_balance: result.metadata && result.metadata.closing_balance,
        transaction_count: result.transaction_count || (result.transactions ? result.transactions.length : 0),
        upload_date: result.upload_date,
        page_count: result.page_count,
        metadata: result.metadata || null,
        transactions: [],
      };
      // Fetch transactions separately
      try {
        const tx = await ApiService.getDocumentTransactions(documentId);
        normalized.transactions = tx.transactions || [];
        if (!normalized.transaction_count) normalized.transaction_count = normalized.transactions.length;
      } catch (e) {
        // keep going if transactions endpoint fails
      }
      setDocument(normalized);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openInsights = async () => {
    setInsightsOpen(true);
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await ApiService.getDocumentInsights(documentId);
      setInsights(res);
    } catch (e) {
      setInsightsError(e.message);
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="error" sx={{ mb: 1 }}>Error Loading Document</Typography>
            <Typography variant="body2" color="text.secondary">{error}</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/documents')}>Back to Documents</Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>Document not found.</Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={document.statement_name || 'Bank Statement'}
          subheader={`Document ID: ${document.document_id}`}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => navigate('/documents')}>← Back to Documents</Button>
              <Button variant="contained" onClick={openInsights}>Loan Analysis</Button>
            </Box>
          }
        />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Opening Balance</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {document.opening_balance ? `$${document.opening_balance}` : 'N/A'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Closing Balance</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {document.closing_balance ? `$${document.closing_balance}` : 'N/A'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Total Transactions</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {document.transaction_count}
              </Typography>
            </Grid>
          </Grid>

          {/* Analysis CTA removed; use modal via header button */}
        </CardContent>
      </Card>

      {/* Transactions table removed per request */}

      {/* Insights Modal */}
      <Dialog open={insightsOpen} onClose={() => setInsightsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Loan Analysis</DialogTitle>
        <DialogContent dividers>
          {insightsLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {!insightsLoading && insightsError && (
            <Typography color="error">{insightsError}</Typography>
          )}
          {!insightsLoading && !insightsError && insights && insights.insights && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Monthly Income</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(insights.insights.monthly_income || 0))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Monthly Expenses</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(insights.insights.monthly_expenses || 0))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Net Cash Flow</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(insights.insights.net_cash_flow || 0))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Transactions Analyzed</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {insights.transaction_count || 0}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsightsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentDetail;