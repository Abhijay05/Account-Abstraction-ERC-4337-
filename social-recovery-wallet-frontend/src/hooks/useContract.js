import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/constants';

export const useContract = () => {
  const { signer, isConnected } = useWallet();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (signer && isConnected) {
      try {
        setLoading(true);
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );
        setContract(contractInstance);
        setError(null);
      } catch (err) {
        setError(err.message);
        setContract(null);
      } finally {
        setLoading(false);
      }
    } else {
      setContract(null);
    }
  }, [signer, isConnected]);

  return { contract, loading, error };
};
