import { useState, useEffect, useCallback } from 'react';
import { useContract } from './useContract';

export const useGuardians = () => {
  const { contract } = useContract();
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadGuardians = useCallback(async () => {
    if (!contract) return;
    try {
      setLoading(true);
      setError(null);
      const guardianList = await contract.guardianList();
      const guardianData = [];
      for (let i = 0; i < guardianList.length; i++) {
        const guardian = await contract.guardians(guardianList[i]);
        guardianData.push({
          address: guardianList[i],
          weight: guardian.weight.toString(),
          isActive: guardian.isActive,
          addedAt: new Date(guardian.addedAt.toNumber() * 1000)
        });
      }
      setGuardians(guardianData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const addGuardian = useCallback(async (address, weight) => {
    if (!contract) throw new Error('Contract not available');
    const tx = await contract.addGuardian(address, weight);
    await tx.wait();
    await loadGuardians();
  }, [contract, loadGuardians]);

  const removeGuardian = useCallback(async (address) => {
    if (!contract) throw new Error('Contract not available');
    const tx = await contract.removeGuardian(address);
    await tx.wait();
    await loadGuardians();
  }, [contract, loadGuardians]);

  useEffect(() => {
    loadGuardians();
  }, [loadGuardians]);

  return {
    guardians,
    loading,
    error,
    addGuardian,
    removeGuardian,
    refreshGuardians: loadGuardians
  };
};
