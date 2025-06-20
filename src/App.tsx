import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/auth/LoginScreen';
import { Header } from './components/dashboard/Header';
import { Navigation } from './components/dashboard/Navigation';
import { BillingSystem } from './components/billing/BillingSystem';
import { CustomerManagement } from './components/customers/CustomerManagement';
import { ReportsSection } from './components/reports/ReportsSection';
import { SettingsSection } from './components/settings/SettingsSection';
import { User } from './types';
import { storageService } from './utils/storage';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('billing');

  useEffect(() => {
    // Check for existing session
    const currentUser = storageService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'billing':
        return <BillingSystem user={user!} />;
      case 'customers':
        return <CustomerManagement />;
      case 'reports':
        return <ReportsSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <BillingSystem user={user!} />;
    }
  };

  if (!user) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=2000')`
        }}
      >
        <div className="min-h-screen backdrop-blur-sm bg-black/20">
          <LoginScreen onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `url('https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=2000')`
      }}
    >
      <div className="min-h-screen backdrop-blur-sm bg-black/10">
        <Header user={user} onLogout={handleLogout} />
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="container mx-auto px-4 py-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;