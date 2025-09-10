import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApiService from '../services/api';

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

  const formatCurrency = (value) => {
    if (!value) return '$0.00';
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value) => {
    if (!value) return '0%';
    const percent = typeof value === 'string' ? parseFloat(value) : value;
    return `${percent.toFixed(1)}%`;
  };

  const getLoanRecommendation = (metrics) => {
    if (!metrics) return { status: 'INSUFFICIENT_DATA', color: 'var(--warning)' };
    
    // Simple loan decision logic based on common banking criteria
    const income = parseFloat(metrics.monthly_income || 0);
    const expenses = parseFloat(metrics.monthly_expenses || 0);
    const cashFlow = parseFloat(metrics.net_cash_flow || 0);
    
    if (income < 5000) {
      return { 
        status: 'HIGH_RISK', 
        reason: 'Low monthly income (<$5,000)',
        color: 'var(--danger)' 
      };
    }
    
    if (cashFlow < 0) {
      return { 
        status: 'HIGH_RISK', 
        reason: 'Negative cash flow',
        color: 'var(--danger)' 
      };
    }
    
    if (cashFlow < income * 0.1) {
      return { 
        status: 'MODERATE_RISK', 
        reason: 'Low cash flow margin (<10% of income)',
        color: 'var(--warning)' 
      };
    }
    
    if (cashFlow > income * 0.2) {
      return { 
        status: 'LOW_RISK', 
        reason: 'Strong cash flow (>20% of income)',
        color: 'var(--success)' 
      };
    }
    
    return { 
      status: 'MODERATE_RISK', 
      reason: 'Adequate cash flow',
      color: 'var(--warning)' 
    };
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div style={{ textAlign: 'center', color: 'var(--danger)', padding: '2rem' }}>
            <h3>Error Loading Insights</h3>
            <p>{error}</p>
            <button 
              className="btn btn-primary"
              onClick={fetchInsights}
              style={{ marginTop: '1rem' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!insights || !insights.insights) {
    return (
      <div className="card">
        <div className="card-body">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h3>No Analysis Available</h3>
            <p>Unable to generate insights for this document.</p>
            <Link to="/documents" className="btn btn-secondary">
              Back to Documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const metrics = insights.insights;
  const metadata = insights.document_metadata;
  const recommendation = getLoanRecommendation(metrics);

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="card-title">Financial Analysis</h2>
              <p className="card-description">
                {metadata?.statement_name || `Document ${documentId.slice(0, 8)}`} • 
                {insights.transaction_count} transactions analyzed
              </p>
            </div>
            <Link to="/documents" className="btn btn-secondary">
              Back to Documents
            </Link>
          </div>
        </div>
      </div>

      {/* Loan Recommendation */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Loan Recommendation</h3>
        </div>
        <div className="card-body">
          <div style={{ 
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: `${recommendation.color}15`,
            borderRadius: '0.75rem',
            border: `2px solid ${recommendation.color}30`
          }}>
            <div style={{ 
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              {recommendation.status === 'LOW_RISK' ? '✅' : 
               recommendation.status === 'MODERATE_RISK' ? '⚠️' : '❌'}
            </div>
            <h3 style={{ 
              color: recommendation.color,
              marginBottom: '0.5rem'
            }}>
              {recommendation.status.replace('_', ' ')}
            </h3>
            <p style={{ color: 'var(--secondary)' }}>
              {recommendation.reason}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid" style={{ marginTop: '1.5rem' }}>
        <div className="card metric-card">
          <div className="card-body">
            <div className="metric-value positive">
              {formatCurrency(metrics.monthly_income)}
            </div>
            <div className="metric-label">Monthly Income</div>
          </div>
        </div>
        
        <div className="card metric-card">
          <div className="card-body">
            <div className="metric-value negative">
              {formatCurrency(metrics.monthly_expenses)}
            </div>
            <div className="metric-label">Monthly Expenses</div>
          </div>
        </div>
        
        <div className="card metric-card">
          <div className="card-body">
            <div className={`metric-value ${parseFloat(metrics.net_cash_flow || 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(metrics.net_cash_flow)}
            </div>
            <div className="metric-label">Net Cash Flow</div>
          </div>
        </div>
        
        <div className="card metric-card">
          <div className="card-body">
            <div className="metric-value">
              {insights.transaction_count}
            </div>
            <div className="metric-label">Transactions</div>
          </div>
        </div>
      </div>

      {/* Statement Details */}
      {metadata && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">Statement Details</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                  Period
                </div>
                <div style={{ fontWeight: '600' }}>
                  {metadata.period_start && metadata.period_end
                    ? `${new Date(metadata.period_start).toLocaleDateString()} - ${new Date(metadata.period_end).toLocaleDateString()}`
                    : 'N/A'}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                  Opening Balance
                </div>
                <div style={{ fontWeight: '600' }}>
                  {formatCurrency(metadata.opening_balance)}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                  Closing Balance
                </div>
                <div style={{ fontWeight: '600' }}>
                  {formatCurrency(metadata.closing_balance)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Insights */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Banking Insights</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--light)', 
              borderRadius: '0.5rem'
            }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Cash Flow Analysis</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
                {parseFloat(metrics.net_cash_flow || 0) >= 0 
                  ? 'Positive cash flow indicates good financial health and ability to service debt.'
                  : 'Negative cash flow raises concerns about debt servicing capacity.'}
              </p>
            </div>
            
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--light)', 
              borderRadius: '0.5rem'
            }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Income Stability</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
                Based on {insights.transaction_count} transactions analyzed. 
                {parseFloat(metrics.monthly_income || 0) > 10000 
                  ? ' Strong income level suggests good repayment capacity.'
                  : ' Consider additional income verification for comprehensive assessment.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentInsights;