import React, { useState } from 'react';
import Header from './Header';
import Navigation from './Navigation';
import Dashboard from '../../pages/Dashboard/Dashboard';
import Guardians from '../../pages/Guardians/Guardians';
import Recovery from '../../pages/Recovery/Recovery';
import './MainLayout.css';

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'guardians':
        return <Guardians />;
      case 'recovery':
        return <Recovery />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Header />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default MainLayout;
