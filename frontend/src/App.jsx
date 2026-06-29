import React from 'react';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">⚽</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="logo-text">AI Football</span>
              <span className="logo-badge">Granite Explainer</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.02em', marginTop: '0.1rem' }}>
              Tactical & Momentum Analyzer
            </div>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="status-badge">
            <span className="status-dot green"></span>
            <span>AI Match Engine Online</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        <Dashboard />
      </main>

      {/* Footer */}
      <footer style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        borderTop: '1px solid var(--border-color)', 
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
        background: 'var(--bg-primary)'
      }}>
        <div>AI Football Match Explainer &copy; 2026</div>
        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
          Powered by IBM Granite &amp; Watsonx.ai
        </div>
      </footer>
    </div>
  );
}
