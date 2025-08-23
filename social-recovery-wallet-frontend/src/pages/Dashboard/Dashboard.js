import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { Contract, formatEther, parseEther } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../utils/constants';

const Dashboard = () => {
  const { account, provider, signer, isConnected, balance } = useWallet();
  const [contract, setContract] = useState(null);
  const [guardianCount, setGuardianCount] = useState(0);

  useEffect(() => {
    if (signer && CONTRACT_ADDRESS) {
      const contractInstance = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(contractInstance);
    }
  }, [signer]);

  useEffect(() => {
    if (contract) {
      loadGuardianCount();
    }
  }, [contract]);

  const loadGuardianCount = async () => {
    try {
      const count = await contract.getGuardianCount();
      setGuardianCount(Number(count));
    } catch (error) {
      console.error('Error loading guardian count:', error);
    }
  };

  if (!isConnected) {
    return (
      <div>
        <h2>Dashboard</h2>
        <p>Please connect your wallet to view your Social Recovery Wallet dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>Wallet Information</h3>
        <p><strong>Address:</strong> {account}</p>
        <p><strong>Balance:</strong> {parseFloat(balance).toFixed(4)} ETH</p>
        <p><strong>Guardians:</strong> {guardianCount}</p>
        <p><strong>Contract:</strong> {CONTRACT_ADDRESS || 'Not deployed'}</p>
      </div>
      
      <div style={{ 
        background: '#e7f3ff', 
        padding: '20px', 
        borderRadius: '8px' 
      }}>
        <h3>Next Steps</h3>
        <ul>
          <li>Go to "Guardians" tab to add trusted guardians</li>
          <li>Test the recovery process with your guardians</li>
          <li>Ensure your guardians understand the recovery process</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
