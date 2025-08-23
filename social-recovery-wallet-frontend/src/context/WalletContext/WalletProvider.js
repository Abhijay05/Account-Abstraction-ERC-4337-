import React, { useState, useEffect } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import { WalletContext } from './WalletContext';

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const switchToZkSync = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x12c' }], // 300 in hex
    });
  } catch (error) {
    console.error('Failed to switch network:', error);
  }
};
  

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }


      // Ethers v6 uses BrowserProvider instead of Web3Provider
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = accounts[0];

      setProvider(provider);
      setSigner(signer);
      setAccount(account);
      setIsConnected(true);

      // Get balance - formatEther is now a direct import
      const balance = await provider.getBalance(account);
      setBalance(formatEther(balance));
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log('Connected to Chain ID:', chainId);
    console.log('Expected zkSync Sepolia Chain ID: 0x12c');
    
    if (chainId !== '0x12c') {
      console.warn('Wrong network! Please switch to zkSync Era Sepolia');
    }

    } catch (err) {
      setError(err.message);
      console.error('Wallet connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setBalance('0');
    setError(null);
  };

  // Check if already connected on load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });
          
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (err) {
          console.error('Error checking connection:', err);
        }
      }
    };

    checkConnection();
  }, []);

  const value = {
    account,
    provider,
    signer,
    isConnected,
    balance,
    loading,
    error,
    connectWallet,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
