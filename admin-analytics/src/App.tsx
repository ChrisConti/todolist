import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Analytics } from './components/Analytics';
import { Funnel } from './components/Funnel';
import { Search } from './components/Search';
import { Export } from './components/Export';
import { Trends } from './components/Trends';
import { Acquisition } from './components/Acquisition';
import { Migration } from './components/Migration';
import { Contractions } from './components/Contractions';
import { Docs } from './components/Docs';
import './App.css';

export type AppType = 'tribubaby' | 'contractions';
export type TabType = 'analytics' | 'trends' | 'acquisition' | 'funnel' | 'search' | 'export' | 'migration' | 'docs';

const AppContent: React.FC = () => {
  const { currentUser, isAdmin, loading } = useAuth();
  const [activeApp, setActiveApp] = useState<AppType>('tribubaby');
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return <Login />;
  }

  const renderTabContent = () => {
    if (activeApp === 'contractions') {
      return <Contractions />;
    }
    switch (activeTab) {
      case 'analytics':
        return <Analytics />;
      case 'trends':
        return <Trends />;
      case 'acquisition':
        return <Acquisition />;
      case 'funnel':
        return <Funnel />;
      case 'search':
        return <Search />;
      case 'export':
        return <Export />;
      case 'migration':
        return <Migration />;
      case 'docs':
        return <Docs />;
      default:
        return <Analytics />;
    }
  };

  return (
    <Layout
      activeApp={activeApp}
      onAppChange={setActiveApp}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {renderTabContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
