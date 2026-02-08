import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Analytics } from './components/Analytics';
import { Funnel } from './components/Funnel';
import { Search } from './components/Search';
import { Export } from './components/Export';
import './App.css';

type TabType = 'analytics' | 'funnel' | 'search' | 'export';

const AppContent: React.FC = () => {
  const { currentUser, isAdmin, loading } = useAuth();
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
    switch (activeTab) {
      case 'analytics':
        return <Analytics />;
      case 'funnel':
        return <Funnel />;
      case 'search':
        return <Search />;
      case 'export':
        return <Export />;
      default:
        return <Analytics />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
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
