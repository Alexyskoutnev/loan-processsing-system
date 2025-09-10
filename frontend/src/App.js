import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Upload from './components/Upload';
import DocumentList from './components/DocumentList';
import DocumentDetail from './components/DocumentDetail';
import DocumentInsights from './components/DocumentInsights';

function Navigation() {
  const location = useLocation();
  
  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <h1 className="nav-title">Bank Statement Analyzer</h1>
          <div className="nav-links">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Upload
            </Link>
            <Link 
              to="/documents" 
              className={`nav-link ${location.pathname === '/documents' ? 'active' : ''}`}
            >
              Documents
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router future={{ v7_relativeSplatPath: true }}>
      <div className="App">
        <Navigation />
        <main className="main">
          <div className="container">
            <Routes>
              <Route path="/" element={<Upload />} />
              <Route path="/documents" element={<DocumentList />} />
              <Route path="/documents/:documentId" element={<DocumentDetail />} />
              <Route path="/insights/:documentId" element={<DocumentInsights />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;