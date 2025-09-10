import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Tooltip,
  Stack,
  Skeleton
} from '@mui/material';
import {
  Upload as UploadIcon,
  Description as DocumentIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  CheckBoxOutlineBlank as CheckBlankIcon,
  CheckBox as CheckIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import ApiService from '../services/api';

const DocumentList = ({ selectedIds: selectedIdsProp, onSelectedChange }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [selectedIdsInternal, setSelectedIdsInternal] = useState(new Set());
  const [previews, setPreviews] = useState({}); // documentId -> data URL for first page
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef(null);

  const selectedIds = selectedIdsProp ? new Set(selectedIdsProp) : selectedIdsInternal;
  const updateSelected = (nextSet) => {
    if (onSelectedChange) {
      onSelectedChange(Array.from(nextSet));
    } else {
      setSelectedIdsInternal(nextSet);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

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

  // Fetch first-page previews for cards (lazy batch)
  useEffect(() => {
    const loadPreviews = async () => {
      if (!documents || documents.length === 0) return;
      setPreviewLoading(true);
      try {
        const promises = documents.map(async (doc) => {
          if (previews[doc.document_id]) return { id: doc.document_id, url: previews[doc.document_id] };
          try {
            const details = await ApiService.getDocumentDetails(doc.document_id);
            // API can return either flat fields or wrapped; normalize
            const pages = details.pages || (details.document && details.document.pages) || [];
            const first = pages && pages.length > 0 ? pages[0] : null;
            if (!first) return { id: doc.document_id, url: null };
            const b64 = first.binary_data || first.file_binary_b64 || null;
            if (!b64) return { id: doc.document_id, url: null };
            // We only know it is a single-page PDF (most likely) – use PDF embed as preview
            const dataUrl = `data:application/pdf;base64,${b64}`;
            return { id: doc.document_id, url: dataUrl };
          } catch (e) {
            return { id: doc.document_id, url: null };
          }
        });
        const results = await Promise.all(promises);
        const next = { ...previews };
        results.forEach(({ id, url }) => {
          if (url) next[id] = url;
        });
        setPreviews(next);
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

  const clearSelection = () => updateSelected(new Set());

  const selectAll = () => updateSelected(new Set(documents.map((d) => d.document_id)));


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
      <Box sx={{ px: 4, pb: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            size="small"
            label={`${selectedIds.size} selected`}
            color={selectedIds.size > 0 ? 'primary' : 'default'}
          />
          <Button size="small" variant="text" onClick={selectAll} disabled={documents.length === 0} sx={{ textTransform: 'none' }}>
            Select All
          </Button>
          <Button size="small" variant="text" onClick={clearSelection} disabled={selectedIds.size === 0} sx={{ textTransform: 'none' }}>
            Clear
          </Button>
        </Stack>
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
                      border: isSelected ? '2px solid' : '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      transition: 'border-color 0.2s ease',
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

                      {/* Checkbox overlay */}
                      <Box sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'background.paper', borderRadius: 1 }} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(doc.document_id)}
                          color="primary"
                          icon={<CheckBlankIcon />}
                          checkedIcon={<CheckIcon />}
                          size="small"
                        />
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
                            sx={{ textTransform: 'none', cursor: 'default' }}
                          >
                            Metadata
                          </Button>
                        </Tooltip>
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