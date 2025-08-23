import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { Contract } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../utils/constants';

const Guardians = () => {
  const { signer, isConnected } = useWallet();
  const [contract, setContract] = useState(null);
  const [guardians, setGuardians] = useState([]);
  const [newGuardian, setNewGuardian] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (signer && CONTRACT_ADDRESS) {
      const contractInstance = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(contractInstance);
      // Don't call loadGuardians here - we'll track locally
    }
  }, [signer]);

  // Simple debug function - no getGuardianCount call
  const debugContract = async () => {
    if (!contract || !signer) {
      console.log("❌ Contract or signer not ready");
      return;
    }

    try {
      console.log("🔍 === CONTRACT DEBUG ===");
      
      const yourAddress = await signer.getAddress();
      console.log("Your address:", yourAddress);
      console.log("Contract address:", CONTRACT_ADDRESS);
      
      const owner = await contract.owner();
      console.log("Contract owner:", owner);
      console.log("Are you owner?", owner.toLowerCase() === yourAddress.toLowerCase());
      
      const guardianStatus = await contract.guardians("0x98b870d3255d9c495ed4a5e2d45c18179c6e7f76");
      console.log("Guardian status:", guardianStatus);
      console.log("Guardian exists?", guardianStatus.isActive);
      
      console.log("🔍 === DEBUG COMPLETE ===");
    } catch (error) {
      console.error("❌ Debug error:", error);
    }
  };

  const handleAddGuardian = async (e) => {
    e.preventDefault();
    if (!newGuardian || !contract) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(newGuardian)) {
        throw new Error('Invalid Ethereum address format');
      }
      const weight = 100;
      const tx = await contract.addGuardian(newGuardian, weight);
      await tx.wait();

      setSuccess('Guardian added successfully!');
      setNewGuardian('');
      
      // Add to local state instead of calling contract
      setGuardians(prev => [...prev, {
        address: newGuardian,
        isActive: true,
        addedAt: new Date().toLocaleDateString(),
        weight: weight 
      }]);
      
    } catch (err) {
      console.error('Error adding guardian:', err);
      setError(err.message || 'Failed to add guardian');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGuardian = async (guardianAddress) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const tx = await contract.removeGuardian(guardianAddress);
      await tx.wait();

      setSuccess('Guardian removed successfully!');
      
      // Remove from local state
      setGuardians(prev => prev.filter(g => g.address !== guardianAddress));
      
    } catch (err) {
      console.error('Error removing guardian:', err);
      setError(err.message || 'Failed to remove guardian');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div>
        <h2>Guardian Management</h2>
        <p>Please connect your wallet to manage guardians.</p>
      </div>
    );
  }

  if (!CONTRACT_ADDRESS) {
    return (
      <div>
        <h2>Guardian Management</h2>
        <p>Contract not deployed. Please deploy your contract first.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Guardian Management</h2>
      
      {/* Debug button */}
      <button onClick={debugContract} style={{ 
        background: '#dc3545', 
        color: 'white', 
        border: 'none', 
        padding: '10px 20px', 
        borderRadius: '5px',
        marginBottom: '20px',
        cursor: 'pointer'
      }}>
        🔍 Debug Contract
      </button>
      
      {error && (
        <div style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '10px', 
          borderRadius: '5px',
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          background: '#e8f5e8', 
          color: '#2e7d32', 
          padding: '10px', 
          borderRadius: '5px',
          marginBottom: '20px' 
        }}>
          {success}
        </div>
      )}

      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>Add New Guardian</h3>
        <form onSubmit={handleAddGuardian}>
          <input
            type="text"
            placeholder="Guardian Address (0x...)"
            value={newGuardian}
            onChange={(e) => setNewGuardian(e.target.value)}
            style={{ 
              padding: '12px', 
              marginRight: '10px', 
              width: '400px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !newGuardian}
            style={{
              padding: '12px 20px',
              background: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Adding...' : 'Add Guardian'}
          </button>
        </form>
        <small style={{ color: '#666', display: 'block', marginTop: '10px' }}>
          Add trusted friends, family members, or other devices as guardians. 
          They will help you recover your wallet if you lose access.
        </small>
      </div>

      <div>
        <h3>Current Guardians ({guardians.length})</h3>
        {loading && <p>Loading guardians...</p>}
        
        {guardians.length === 0 && !loading ? (
          <div style={{ 
            background: '#fff3cd', 
            color: '#856404', 
            padding: '15px', 
            borderRadius: '5px' 
          }}>
            <p><strong>No guardians added yet.</strong></p>
            <p>Add at least 2-3 trusted guardians to enable social recovery for your wallet.</p>
          </div>
        ) : (
          <div>
            {guardians.map((guardian, index) => (
              <div key={index} style={{ 
                border: '1px solid #ddd', 
                padding: '15px', 
                margin: '10px 0',
                borderRadius: '8px',
                background: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                    {guardian.address}
                  </strong>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Added: {guardian.addedAt}
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveGuardian(guardian.address)}
                  disabled={loading}
                  style={{ 
                    background: '#dc3545', 
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ 
        background: '#e7f3ff', 
        padding: '20px', 
        borderRadius: '8px',
        marginTop: '20px' 
      }}>
        <h4>💡 Guardian Best Practices</h4>
        <ul>
          <li>Choose trusted individuals who understand crypto</li>
          <li>Use at least 2-3 guardians for better security</li>
          <li>Don't use exchange addresses as guardians</li>
          <li>Inform your guardians about their role</li>
          <li>Test the recovery process with your guardians</li>
        </ul>
      </div>
    </div>
  );
};

export default Guardians;
