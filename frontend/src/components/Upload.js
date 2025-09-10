import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/api';

const Upload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleFile = async (file) => {
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('File size must be less than 50MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await ApiService.uploadDocument(file);
      setSuccess(`Successfully processed ${file.name}! Found ${result.document.transaction_count} transactions.`);
      
      // Auto-redirect to documents after success
      setTimeout(() => {
        navigate('/documents');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Upload Bank Statement</h2>
        <p className="card-description">
          Upload a PDF bank statement to analyze transactions and generate loan insights.
          The system will automatically extract transaction data and provide financial analysis.
        </p>
      </div>
      
      <div className="card-body">
        <div
          className={`upload-zone ${dragActive ? 'dragover' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            type="file"
            id="file-input"
            accept=".pdf"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          
          <div className="upload-icon">
            📄
          </div>
          
          {isUploading ? (
            <div>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p>Processing bank statement...</p>
              <p style={{ color: 'var(--secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                This may take a few moments while we extract and analyze the transactions.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Drop your PDF here, or click to browse
              </p>
              <p style={{ color: 'var(--secondary)' }}>
                Supports PDF files up to 50MB
              </p>
            </div>
          )}
        </div>

        {error && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '0.5rem',
            color: 'var(--danger)'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.2)', 
            borderRadius: '0.5rem',
            color: 'var(--success)'
          }}>
            <strong>Success!</strong> {success}
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              Redirecting to documents list...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;