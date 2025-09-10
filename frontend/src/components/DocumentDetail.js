import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../services/api';
import TransactionTable from './TransactionTable';

const DocumentDetail = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyzingLoan, setAnalyzingLoan] = useState(false);

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
      setDocument(result.document);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoanAnalysis = async () => {
    try {
      setAnalyzingLoan(true);
      const insights = await ApiService.getDocumentInsights(documentId);
      
      // Navigate to insights page or show results
      navigate(`/insights/${documentId}`, { state: { insights, document } });
    } catch (err) {
      setError(`Failed to analyze loan: ${err.message}`);
    } finally {
      setAnalyzingLoan(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading document details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: 'var(--danger)'
          }}>
            <h3>Error Loading Document</h3>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/documents')}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Back to Documents
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="card">
        <div className="card-body">
          <p style={{ textAlign: 'center', padding: '2rem' }}>
            Document not found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      {/* Document Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h1 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                {document.statement_name || 'Bank Statement'}
              </h1>
              <p className="card-description">
                Document ID: {document.document_id}
              </p>
            </div>
            <button
              onClick={() => navigate('/documents')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                color: 'var(--secondary)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              ← Back to Documents
            </button>
          </div>
        </div>
        <div className="card-body">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                Opening Balance
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                {document.opening_balance ? `$${document.opening_balance}` : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                Closing Balance
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                {document.closing_balance ? `$${document.closing_balance}` : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                Total Transactions
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                {document.transaction_count}
              </p>
            </div>
          </div>

          {/* Loan Analysis Button */}
          <div style={{ 
            padding: '1rem',
            backgroundColor: 'var(--muted)',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>
              Loan Analysis
            </h3>
            <p style={{ 
              marginBottom: '1rem', 
              color: 'var(--secondary)',
              fontSize: '0.875rem'
            }}>
              Generate comprehensive loan underwriting analysis based on these transactions
            </p>
            <button
              onClick={handleLoanAnalysis}
              disabled={analyzingLoan}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: analyzingLoan ? 'var(--secondary)' : 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: analyzingLoan ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '0 auto'
              }}
            >
              {analyzingLoan && (
                <div className="spinner" style={{ 
                  width: '16px', 
                  height: '16px',
                  borderWidth: '2px'
                }}></div>
              )}
              {analyzingLoan ? 'Analyzing...' : '🧮 Run Loan Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <TransactionTable 
        transactions={document.transactions} 
        loading={false}
      />
    </div>
  );
};

export default DocumentDetail;