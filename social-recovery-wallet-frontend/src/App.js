import React from 'react';
import { WalletProvider } from './context/WalletContext';
import MainLayout from './components/layout/MainLayout';
import './styles/globals.css';

function App() {
  return (
    <WalletProvider>
      <MainLayout />
    </WalletProvider>
  );
}

export default App;
