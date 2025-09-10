import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../services/api';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getDocuments();
      setDocuments(response.documents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance) => {
    if (!balance) return 'N/A';
    const amount = parseFloat(balance);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getDocumentStatus = (doc) => {
    if (!doc.has_metadata) {
      return { label: 'Processing', class: 'badge-warning' };
    }
    if (doc.transaction_count === 0) {
      return { label: 'No Transactions', class: 'badge-warning' };
    }
    return { label: 'Ready for Analysis', class: 'badge-success' };
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
          <div style={{ 
            textAlign: 'center', 
            color: 'var(--danger)',
            padding: '2rem'
          }}>
            <h3>Error Loading Documents</h3>
            <p>{error}</p>
            <button 
              className="btn btn-primary"
              onClick={fetchDocuments}
              style={{ marginTop: '1rem' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <h3 style={{ marginBottom: '1rem' }}>No Bank Statements Yet</h3>
            <p style={{ color: 'var(--secondary)', marginBottom: '2rem' }}>
              Upload your first bank statement to get started with automated loan analysis.
            </p>
            <Link to="/" className="btn btn-primary">
              Upload Statement
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Bank Statements ({documents.length})</h2>
          <p className="card-description">
            Click on any statement to view detailed financial analysis and loan recommendations.
          </p>
        </div>
      </div>

      <div className="document-grid">
        {documents.map((doc) => {
          const status = getDocumentStatus(doc);
          
          return (
            <Link
              key={doc.document_id}
              to={`/documents/${doc.document_id}`}
              className="document-card card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '2rem' }}>🏦</div>
                  <span className={`badge ${status.class}`}>
                    {status.label}
                  </span>
                </div>
                
                <h3 style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {doc.statement_name || `Statement ${doc.document_id.slice(0, 8)}`}
                </h3>
                
                <div style={{ color: 'var(--secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  <div>Transactions: <strong>{doc.transaction_count}</strong></div>
                  {doc.opening_balance && (
                    <div>Opening: <strong>{formatBalance(doc.opening_balance)}</strong></div>
                  )}
                  {doc.closing_balance && (
                    <div>Closing: <strong>{formatBalance(doc.closing_balance)}</strong></div>
                  )}
                </div>
                
                <div style={{ 
                  padding: '0.75rem',
                  backgroundColor: 'var(--light)',
                  borderRadius: '0.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Click to analyze →
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link to="/" className="btn btn-secondary">
          Upload Another Statement
        </Link>
      </div>
    </div>
  );
};

export default DocumentList;