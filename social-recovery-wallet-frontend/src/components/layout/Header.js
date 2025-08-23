import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import './Header.css';

const Header = () => {
  const { account, balance, isConnected, connectWallet, disconnectWallet, loading } = useWallet();

  return (
    <div className="app-header">
      <h1>Social Recovery Wallet</h1>
      <div>
        {!isConnected ? (
          <button 
            className="connect-button" 
            onClick={connectWallet}
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="account-info">
            <div>Account: {account?.slice(0, 6)}...{account?.slice(-4)}</div>
            <div className="balance">Balance: {parseFloat(balance).toFixed(4)} ETH</div>
            <button className="connect-button" onClick={disconnectWallet}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
