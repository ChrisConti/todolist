import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'analytics' | 'trends' | 'acquisition' | 'funnel' | 'search' | 'export' | 'migration';
  onTabChange: (tab: 'analytics' | 'trends' | 'acquisition' | 'funnel' | 'search' | 'export' | 'migration') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUser, signOut } = useAuth();

  const handleSignOut = async () => {
    if (window.confirm('Voulez-vous vraiment vous déconnecter ?')) {
      await signOut();
    }
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1>TribuBaby Analytics</h1>
          <div className="header-right">
            <span className="user-email">{currentUser?.email}</span>
            <button onClick={handleSignOut} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>

        <nav className="tabs">
          <button
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => onTabChange('analytics')}
          >
            📊 Analytics
          </button>
          <button
            className={`tab ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => onTabChange('trends')}
          >
            📈 Évolution
          </button>
          <button
            className={`tab ${activeTab === 'acquisition' ? 'active' : ''}`}
            onClick={() => onTabChange('acquisition')}
          >
            📥 Acquisition
          </button>
          <button
            className={`tab ${activeTab === 'funnel' ? 'active' : ''}`}
            onClick={() => onTabChange('funnel')}
          >
            🔀 Funnel
          </button>
          <button
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => onTabChange('search')}
          >
            🔍 Recherche
          </button>
          <button
            className={`tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => onTabChange('export')}
          >
            📥 Export
          </button>
          <button
            className={`tab ${activeTab === 'migration' ? 'active' : ''}`}
            onClick={() => onTabChange('migration')}
          >
            🔧 Migration
          </button>
        </nav>
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
