import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider
} from '@mui/material';
import { Description as DocumentIcon, TableChart as TableIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
import DocumentList from './components/DocumentList';
import DocumentDetail from './components/DocumentDetail';
import DocumentInsights from './components/DocumentInsights';
import SelectedTransactionsPage from './components/SelectedTransactionsPage';
import SelectedInsightsPage from './components/SelectedInsightsPage';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
    }
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h4: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h6: {
      fontWeight: 500,
    },
    subtitle1: {
      fontWeight: 500,
    }
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e0e0e0',
          backgroundColor: '#fafafa',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: '#1976d2',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
            '& .MuiListItemIcon-root': {
              color: '#ffffff',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
  },
});

const drawerWidth = 280;

function App() {
  const [activeTab, setActiveTab] = useState('documents');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router future={{ v7_relativeSplatPath: true }}>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          {/* Sidebar Drawer */}
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
          >
           
            <Divider />

            {/* Navigation */}
            <Box sx={{ flexGrow: 1, p: 1 }}>
              <List>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/documents"
                    selected={activeTab === 'documents'}
                    onClick={() => setActiveTab('documents')}
                  >
                    <ListItemIcon>
                      <DocumentIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Documents" 
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/selected"
                    selected={activeTab === 'selected'}
                    onClick={() => setActiveTab('selected')}
                  >
                    <ListItemIcon>
                      <TableIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Transactions" 
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton
                    component={RouterLink}
                    to="/selected-insights"
                    selected={activeTab === 'selected-insights'}
                    onClick={() => setActiveTab('selected-insights')}
                  >
                    <ListItemIcon>
                      <AssessmentIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Risk Engine" 
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>

          </Drawer>

          {/* Main Content */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.default',
            }}
          >
            <Routes>
              <Route path="/" element={<DocumentList selectedIds={selectedDocumentIds} onSelectedChange={setSelectedDocumentIds} />} />
              <Route path="/documents" element={<DocumentList selectedIds={selectedDocumentIds} onSelectedChange={setSelectedDocumentIds} />} />
              <Route path="/selected" element={<SelectedTransactionsPage selectedIds={selectedDocumentIds} />} />
              <Route path="/selected-insights" element={<SelectedInsightsPage selectedIds={selectedDocumentIds} />} />
              <Route path="/documents/:documentId" element={<DocumentDetail />} />
              <Route path="/insights/:documentId" element={<DocumentInsights />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;