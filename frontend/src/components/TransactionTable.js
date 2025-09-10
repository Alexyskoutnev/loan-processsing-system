import React from 'react';

const TransactionTable = ({ transactions, loading = false }) => {
  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transactions</h3>
        </div>
        <div className="card-body">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transactions</h3>
        </div>
        <div className="card-body">
          <p style={{ textAlign: 'center', color: 'var(--secondary)', padding: '2rem' }}>
            No transactions found.
          </p>
        </div>
      </div>
    );
  }

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryColor = (category) => {
    const categoryColors = {
      'salary_wages': '#10B981',
      'business_revenue': '#10B981', 
      'interest_income': '#10B981',
      'dividends': '#10B981',
      'groceries': '#F59E0B',
      'dining': '#F59E0B',
      'entertainment': '#F59E0B',
      'rent': '#EF4444',
      'mortgage': '#EF4444',
      'utilities': '#EF4444',
      'loan_payment': '#EF4444',
      'credit_card_payment': '#EF4444',
      'transfer_in': '#6B7280',
      'transfer_out': '#6B7280',
      'other': '#6B7280',
    };
    return categoryColors[category] || '#6B7280';
  };

  const formatCategory = (category) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Transactions ({transactions.length})</h3>
        <p className="card-description">
          Extracted and categorized transactions from the bank statement
        </p>
      </div>
      <div className="card-body">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '0.875rem'
          }}>
            <thead>
              <tr style={{ 
                borderBottom: '2px solid var(--border)', 
                backgroundColor: 'var(--muted)' 
              }}>
                <th style={{ 
                  padding: '0.75rem', 
                  textAlign: 'left', 
                  fontWeight: '600',
                  color: 'var(--foreground)'
                }}>Date</th>
                <th style={{ 
                  padding: '0.75rem', 
                  textAlign: 'left', 
                  fontWeight: '600',
                  color: 'var(--foreground)'
                }}>Description</th>
                <th style={{ 
                  padding: '0.75rem', 
                  textAlign: 'left', 
                  fontWeight: '600',
                  color: 'var(--foreground)'
                }}>Category</th>
                <th style={{ 
                  padding: '0.75rem', 
                  textAlign: 'right', 
                  fontWeight: '600',
                  color: 'var(--foreground)'
                }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <tr key={transaction.transaction_id || index} style={{ 
                  borderBottom: '1px solid var(--border)',
                  '&:hover': { backgroundColor: 'var(--muted)' }
                }}>
                  <td style={{ 
                    padding: '0.75rem',
                    color: 'var(--secondary)'
                  }}>
                    {formatDate(transaction.date)}
                  </td>
                  <td style={{ 
                    padding: '0.75rem',
                    color: 'var(--foreground)',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }} title={transaction.description}>
                    {transaction.description || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: getCategoryColor(transaction.category) + '20',
                      color: getCategoryColor(transaction.category),
                      border: `1px solid ${getCategoryColor(transaction.category)}30`
                    }}>
                      {formatCategory(transaction.category)}
                    </span>
                  </td>
                  <td style={{ 
                    padding: '0.75rem',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: parseFloat(transaction.amount) >= 0 ? '#10B981' : '#EF4444'
                  }}>
                    {formatAmount(transaction.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;