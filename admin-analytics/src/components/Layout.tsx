import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { AppType, TabType } from '../App';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  activeApp: AppType;
  onAppChange: (app: AppType) => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TRIBUBABY_TABS: { id: TabType; label: string }[] = [
  { id: 'analytics', label: '📊 Analytics' },
  { id: 'trends', label: '📈 Évolution' },
  { id: 'acquisition', label: '📥 Acquisition' },
  { id: 'funnel', label: '🔀 Funnel' },
  { id: 'search', label: '🔍 Recherche' },
  { id: 'export', label: '📥 Export' },
  { id: 'migration', label: '🔧 Migration' },
  { id: 'docs', label: '📚 Docs' },
];

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeApp,
  onAppChange,
  activeTab,
  onTabChange,
}) => {
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
          <div className="app-switcher">
            <button
              className={`app-title ${activeApp === 'tribubaby' ? 'active' : ''}`}
              onClick={() => onAppChange('tribubaby')}
            >
              TribuBaby
            </button>
            <span className="app-switcher-sep">·</span>
            <button
              className={`app-title ${activeApp === 'contractions' ? 'active' : ''}`}
              onClick={() => onAppChange('contractions')}
            >
              Contractions
            </button>
          </div>
          <div className="header-right">
            <span className="user-email">{currentUser?.email}</span>
            <button onClick={handleSignOut} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>

        {activeApp === 'tribubaby' && (
          <nav className="tabs">
            {TRIBUBABY_TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`tab ${activeTab === id ? 'active' : ''}`}
                onClick={() => onTabChange(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
