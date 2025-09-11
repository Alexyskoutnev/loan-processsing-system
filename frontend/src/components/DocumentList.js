import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Container,
  Checkbox,
  Tooltip,
  Skeleton
} from '@mui/material';
import {
  Upload as UploadIcon,
  Description as DocumentIcon,
  Refresh as RefreshIcon,
  CheckBox as CheckIcon
} from '@mui/icons-material';
import ApiService from '../services/api';

// Global cache for PDF previews - persists across tab switches and component unmounts
const previewCache = new Map();
const CACHE_KEY_PREFIX = 'pdf_preview_';
const CACHE_EXPIRY_HOURS = 24;

// Helper to get cached preview
const getCachedPreview = (documentId) => {
  // First check memory cache
  if (previewCache.has(documentId)) {
    return previewCache.get(documentId);
  }
  
  // Then check localStorage
  try {
    const cacheKey = CACHE_KEY_PREFIX + documentId;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      const expiryTime = timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
      
      if (now < expiryTime) {
        // Cache is still valid, store in memory for faster access
        previewCache.set(documentId, data);
        return data;
      } else {
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
      }
    }
  } catch (e) {
    console.warn('Error reading preview cache:', e);
  }
  
  return null;
};

// Helper to cache preview
const cachePreview = (documentId, dataUrl) => {
  if (!dataUrl) return;
  
  // Store in memory cache
  previewCache.set(documentId, dataUrl);
  
  // Store in localStorage with timestamp (only if it's not too large)
  try {
    const cacheKey = CACHE_KEY_PREFIX + documentId;
    const cacheData = {
      data: dataUrl,
      timestamp: Date.now()
    };
    
    // Check size before storing (localStorage has ~5-10MB limit)
    const dataSize = new Blob([JSON.stringify(cacheData)]).size;
    if (dataSize < 1024 * 1024) { // Only cache if under 1MB
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } else {
      console.warn(`Preview too large to cache: ${dataSize} bytes for ${documentId}`);
    }
  } catch (e) {
    console.warn('Error caching preview:', e);
    // If localStorage is full, try to clear old entries
    cleanPreviewCache();
  }
};

// Helper to clean expired cache entries
const cleanPreviewCache = () => {
  try {
    const keys = Object.keys(localStorage);
    const previewKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
    const now = Date.now();
    
    previewKeys.forEach(key => {
      try {
        const cached = JSON.parse(localStorage.getItem(key));
        const expiryTime = cached.timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
        if (now >= expiryTime) {
          localStorage.removeItem(key);
        }
      } catch (err) {
        localStorage.removeItem(key); // Remove corrupted entries
      }
    });
    
    console.log(`Cleaned ${previewKeys.length} preview cache entries`);
  } catch (err) {
    console.warn('Error cleaning cache:', err);
  }
};

const DocumentList = ({ selectedIds: selectedIdsProp, onSelectedChange }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [selectedIdsInternal, setSelectedIdsInternal] = useState(new Set());
  const [previews, setPreviews] = useState({}); // documentId -> data URL for first page
  const [, setPreviewLoading] = useState(false);
  // Initialize hasAutoSelected from localStorage to persist across tab navigation
  const [hasAutoSelected, setHasAutoSelected] = useState(() => {
    return localStorage.getItem('hasAutoSelectedDocuments') === 'true';
  });
  const fileInputRef = useRef(null);

  const selectedIds = selectedIdsProp ? new Set(selectedIdsProp) : selectedIdsInternal;
  const updateSelected = useCallback((nextSet) => {
    if (onSelectedChange) {
      onSelectedChange(Array.from(nextSet));
    } else {
      setSelectedIdsInternal(nextSet);
    }
  }, [onSelectedChange]);

  const clearSelection = () => {
    console.log('Clearing selection');
    updateSelected(new Set());
    // Keep hasAutoSelected as true to prevent auto-reselection after manual clear
  };

  const selectAll = () => {
    console.log('Selecting all documents:', documents.map((d) => d.document_id));
    updateSelected(new Set(documents.map((d) => d.document_id)));
  };

  useEffect(() => {
    // Clean expired cache entries on component mount
    cleanPreviewCache();
    fetchDocuments();
  }, []);

  // Auto-select all documents only on very first app load, not when navigating between tabs
  useEffect(() => {
    const parentHasSelection = selectedIdsProp && selectedIdsProp.length > 0;
    
    // If we haven't auto-selected before and there's no existing selection anywhere
    if (documents.length > 0 && !hasAutoSelected && selectedIds.size === 0 && !parentHasSelection) {
      console.log('Auto-selecting all documents on first app visit');
      updateSelected(new Set(documents.map((d) => d.document_id)));
      setHasAutoSelected(true);
      localStorage.setItem('hasAutoSelectedDocuments', 'true');
    } 
    // If parent has selection or we've already auto-selected, just mark as handled
    else if ((parentHasSelection || documents.length > 0) && !hasAutoSelected) {
      console.log('Marking auto-selection as handled to preserve state');
      setHasAutoSelected(true);
      localStorage.setItem('hasAutoSelectedDocuments', 'true');
    }
  }, [documents, selectedIds.size, updateSelected, hasAutoSelected, selectedIdsProp]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getDocuments();
      setDocuments(response.documents || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      await ApiService.uploadDocument(file);
      setSnackbarOpen(true);
      // Don't reset hasAutoSelected - preserve user's selection state
      await fetchDocuments(); // Refresh the list
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusChip = (doc) => {
    const isReady = doc.has_metadata && doc.transaction_count > 0;
    return (
      <Chip
        size="small"
        label={isReady ? 'Ready' : 'Processing'}
        color={isReady ? 'success' : 'warning'}
        variant="outlined"
        sx={{ fontSize: '0.75rem' }}
      />
    );
  };

  // Load previews with caching - no more flickering!
  useEffect(() => {
    const loadPreviews = async () => {
      if (!documents || documents.length === 0) return;
      
      // First, check cache for all documents and set immediate previews
      const initialPreviews = {};
      const documentsNeedingFetch = [];
      
      documents.forEach(doc => {
        const cachedUrl = getCachedPreview(doc.document_id);
        if (cachedUrl) {
          initialPreviews[doc.document_id] = cachedUrl;
        } else {
          documentsNeedingFetch.push(doc);
        }
      });
      
      // Set cached previews immediately (no flickering!)
      if (Object.keys(initialPreviews).length > 0) {
        setPreviews(prev => ({ ...prev, ...initialPreviews }));
      }
      
      // Only fetch uncached documents
      if (documentsNeedingFetch.length === 0) return;
      
      setPreviewLoading(true);
      try {
        console.log(`Fetching ${documentsNeedingFetch.length} uncached document previews`);
        const promises = documentsNeedingFetch.map(async (doc) => {
          try {
            const details = await ApiService.getDocumentDetails(doc.document_id);
            const pages = details.pages || (details.document && details.document.pages) || [];
            const first = pages && pages.length > 0 ? pages[0] : null;
            if (!first) return { id: doc.document_id, url: null };
            const b64 = first.binary_data || first.file_binary_b64 || null;
            if (!b64) return { id: doc.document_id, url: null };
            const dataUrl = `data:application/pdf;base64,${b64}`;
            
            // Cache the preview
            cachePreview(doc.document_id, dataUrl);
            
            return { id: doc.document_id, url: dataUrl };
          } catch (e) {
            console.warn(`Failed to load preview for ${doc.document_id}:`, e);
            return { id: doc.document_id, url: null };
          }
        });
        
        const results = await Promise.all(promises);
        const newPreviews = {};
        results.forEach(({ id, url }) => {
          if (url) newPreviews[id] = url;
        });
        
        if (Object.keys(newPreviews).length > 0) {
          setPreviews(prev => ({ ...prev, ...newPreviews }));
        }
      } finally {
        setPreviewLoading(false);
      }
    };
    
    loadPreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  const toggleSelect = (documentId) => {
    const next = new Set(selectedIds);
    if (next.has(documentId)) next.delete(documentId); else next.add(documentId);
    updateSelected(next);
  };

  // Note: Do not block the whole page during initial load; render skeletons instead

  // Error state
  if (error && documents.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 3
          }}
        >
          <Typography variant="h5" color="error">
            Unable to Load Documents
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchDocuments}
          >
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  // Main render
  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 4,
        pb: 2
      }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Documents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        
        {/* Upload Button */}
        <Button
          variant="contained"
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
          onClick={handleUploadClick}
          disabled={uploading}
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            py: 1
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          variant="filled"
        >
          Document uploaded successfully!
        </Alert>
      </Snackbar>

      {/* Selection Toolbar */}
      <Box sx={{ px: 4, pb: 2 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          borderRadius: 3,
          backgroundColor: selectedIds.size > 0 ? 'rgba(0, 122, 255, 0.05)' : '#f8fafc',
          border: selectedIds.size > 0 ? '1px solid rgba(0, 122, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease-in-out'
        }}>
          <Chip
            label={`${selectedIds.size} selected`}
            sx={{
              backgroundColor: selectedIds.size > 0 ? '#007AFF' : '#e2e8f0',
              color: selectedIds.size > 0 ? 'white' : '#64748b',
              fontWeight: 600,
              fontSize: '0.875rem',
              height: 32,
              '& .MuiChip-label': {
                px: 2
              }
            }}
          />
          <Button 
            size="small" 
            variant="text" 
            onClick={selectAll} 
            disabled={documents.length === 0} 
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              color: '#007AFF',
              '&:hover': {
                backgroundColor: 'rgba(0, 122, 255, 0.1)'
              }
            }}
          >
            Select All
          </Button>
          <Button 
            size="small" 
            variant="text" 
            onClick={clearSelection} 
            disabled={selectedIds.size === 0} 
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              color: '#64748b',
              '&:hover': {
                backgroundColor: 'rgba(100, 116, 139, 0.1)'
              }
            }}
          >
            Clear
          </Button>
        </Box>
      </Box>

      {/* Documents Grid */}
      <Box sx={{ flexGrow: 1, px: 4, pb: 4 }}>
        {documents.length > 0 ? (
          <Grid container spacing={2}>
            {documents.map((doc) => {
              const isSelected = selectedIds.has(doc.document_id);
              const previewUrl = previews[doc.document_id];
              return (
                <Grid key={doc.document_id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card
                    sx={{
                      position: 'relative',
                      border: isSelected ? '3px solid' : '1px solid',
                      borderColor: isSelected ? '#007AFF' : 'rgba(0, 0, 0, 0.08)',
                      borderRadius: 3,
                      transition: 'all 0.2s ease-in-out',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(0, 122, 255, 0.02)' : 'background.paper',
                      boxShadow: isSelected 
                        ? '0 4px 20px rgba(0, 122, 255, 0.15)' 
                        : '0 1px 3px rgba(0, 0, 0, 0.08)',
                      '&:hover': {
                        borderColor: isSelected ? '#007AFF' : 'rgba(0, 122, 255, 0.3)',
                        transform: 'translateY(-1px)',
                        boxShadow: isSelected 
                          ? '0 8px 30px rgba(0, 122, 255, 0.2)' 
                          : '0 4px 20px rgba(0, 0, 0, 0.12)',
                      },
                      '&:active': {
                        transform: 'translateY(0px)',
                      }
                    }}
                    onClick={() => toggleSelect(doc.document_id)}
                  >
                    {/* Preview */}
                    <Box sx={{ position: 'relative', p: 1 }}>
                      <Box sx={{ position: 'relative', width: '100%', pt: '140%', borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100' }}>
                        {previewUrl ? (
                          <object data={previewUrl} type="application/pdf" width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <DocumentIcon sx={{ color: 'grey.400', fontSize: 40 }} />
                            </Box>
                          </object>
                        ) : (
                          <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Skeleton variant="rectangular" width="100%" height="100%" />
                          </Box>
                        )}
                      </Box>

                      {/* Selection overlay - larger clickable area */}
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          left: 8, 
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 2,
                          '&:hover .selection-button': {
                            transform: 'scale(1.15)',
                          }
                        }} 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(doc.document_id);
                        }}
                      >
                        <Box 
                          className="selection-button"
                          sx={{ 
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            bgcolor: isSelected ? '#007AFF' : 'rgba(255, 255, 255, 0.95)',
                            border: isSelected ? 'none' : '2px solid rgba(0, 0, 0, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(10px)',
                            boxShadow: isSelected 
                              ? '0 2px 12px rgba(0, 122, 255, 0.4)' 
                              : '0 2px 8px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s ease-in-out',
                          }}
                        >
                          {isSelected ? (
                            <CheckIcon sx={{ color: 'white', fontSize: 16 }} />
                          ) : (
                            <Box 
                              sx={{ 
                                width: 10, 
                                height: 10, 
                                borderRadius: '50%', 
                                border: '2px solid #666',
                                opacity: 0.7
                              }} 
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* Info */}
                    <CardContent sx={{ pt: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 0.5 }} noWrap>
                        {doc.statement_name || doc.filename || `Document ${doc.document_id.slice(0, 8)}`}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {doc.transaction_count} txns
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {doc.page_count} pages
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(doc.upload_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </CardContent>

                    <CardActions sx={{ justifyContent: 'space-between', pt: 0, px: 2, pb: 2 }}>
                      {getStatusChip(doc)}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary', 
                            fontSize: '0.7rem',
                            opacity: 0.8
                          }}
                        >
                          Click to {isSelected ? 'deselect' : 'select'}
                        </Typography>
                        <Box onClick={(e) => e.stopPropagation()}>
                          <Tooltip
                            arrow
                            placement="top"
                            enterDelay={300}
                            slotProps={{
                              tooltip: { sx: { bgcolor: 'grey.900', color: 'common.white', boxShadow: 4, opacity: 0.98, border: '1px solid', borderColor: 'grey.800' } },
                              arrow: { sx: { color: 'grey.900' } }
                            }}
                            title={
                              <Box sx={{ p: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'common.white' }}>
                                  {doc.statement_name || doc.filename}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', color: 'common.white' }}>
                                  Pages: {doc.page_count} · Txns: {doc.transaction_count}
                                </Typography>
                                {(doc.opening_balance || doc.closing_balance) && (
                                  <Typography variant="caption" sx={{ display: 'block', color: 'common.white' }}>
                                    Balances: {doc.opening_balance ? `$${doc.opening_balance}` : '—'} → {doc.closing_balance ? `$${doc.closing_balance}` : '—'}
                                  </Typography>
                                )}
                                {doc.upload_date && (
                                  <Typography variant="caption" sx={{ display: 'block', color: 'common.white' }}>
                                    Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Box>
                            }
                          >
                            <Button
                              size="small"
                              variant="text"
                              disableRipple
                              disableFocusRipple
                              tabIndex={-1}
                              sx={{ textTransform: 'none', cursor: 'default', minWidth: 'auto', px: 1 }}
                            >
                              Details
                            </Button>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : loading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <Grid key={idx} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card>
                  <Box sx={{ p: 1 }}>
                    <Box sx={{ position: 'relative', width: '100%', pt: '140%', borderRadius: 1, overflow: 'hidden' }}>
                      <Skeleton variant="rectangular" width="100%" height="100%" sx={{ position: 'absolute', top: 0, left: 0 }} />
                    </Box>
                  </Box>
                  <CardContent sx={{ pt: 0 }}>
                    <Skeleton width="80%" />
                    <Skeleton width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          /* Empty State */
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            py: 12,
            height: '60vh'
          }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'grey.100',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3
              }}
            >
              <DocumentIcon sx={{ fontSize: 40, color: 'grey.400' }} />
            </Box>
            
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
              No documents yet
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 300 }}>
              Upload your first document to get started with analysis
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={handleUploadClick}
              sx={{ 
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Upload Document
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentList;