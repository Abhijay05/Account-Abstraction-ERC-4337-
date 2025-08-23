import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { Contract } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../utils/constants';

const Recovery = () => {
  const { signer, isConnected } = useWallet();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [guardianAddresses, setGuardianAddresses] = useState(['', '']);

  useEffect(() => {
    if (signer && CONTRACT_ADDRESS) {
      const contractInstance = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(contractInstance);
    }
  }, [signer]);

  const handleProposeRecovery = async (e) => {
    e.preventDefault();
    if (!newOwner || !contract) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Validate addresses
      if (!/^0x[a-fA-F0-9]{40}$/.test(newOwner)) {
        throw new Error('Invalid new owner address format');
      }

      const validGuardians = guardianAddresses.filter(addr => 
        addr && /^0x[a-fA-F0-9]{40}$/.test(addr)
      );

      if (validGuardians.length < 2) {
        throw new Error('Please provide at least 2 valid guardian addresses');
      }

      // For demo purposes, we'll use empty signatures
      const guardianSignatures = validGuardians.map(() => '0x');

      const tx = await contract.proposeRecovery(
        newOwner,
        validGuardians,
        guardianSignatures
      );
      await tx.wait();

      setSuccess('Recovery proposal submitted successfully! Recovery will be available after the delay period.');
      setNewOwner('');
      setGuardianAddresses(['', '']);
    } catch (err) {
      console.error('Error proposing recovery:', err);
      setError(err.message || 'Failed to propose recovery');
    } finally {
      setLoading(false);
    }
  };

  const addGuardianField = () => {
    setGuardianAddresses([...guardianAddresses, '']);
  };

  const removeGuardianField = (index) => {
    const newAddresses = guardianAddresses.filter((_, i) => i !== index);
    setGuardianAddresses(newAddresses);
  };

  const updateGuardianAddress = (index, value) => {
    const newAddresses = [...guardianAddresses];
    newAddresses[index] = value;
    setGuardianAddresses(newAddresses);
  };

  if (!isConnected) {
    return (
      <div>
        <h2>Account Recovery</h2>
        <p>Please connect your wallet to access recovery features.</p>
      </div>
    );
  }

  if (!CONTRACT_ADDRESS) {
    return (
      <div>
        <h2>Account Recovery</h2>
        <p>Contract not deployed. Please deploy your contract first.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Account Recovery</h2>
      
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
        background: '#fff3cd', 
        color: '#856404', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px' 
      }}>
        <h4>⚠️ Recovery Process</h4>
        <p>
          Use this feature only if you've lost access to your wallet and need to recover it.
          Your guardians must approve this recovery request.
        </p>
        <p><strong>Recovery Delay:</strong> 10 seconds</p>
      </div>

      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>Propose Account Recovery</h3>
        <form onSubmit={handleProposeRecovery}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              New Owner Address:
            </label>
            <input
              type="text"
              placeholder="New owner address (0x...)"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              style={{ 
                padding: '12px', 
                width: '100%',
                maxWidth: '500px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
              disabled={loading}
            />
            <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
              This will be the new owner of the wallet after recovery
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Guardian Addresses:
            </label>
            {guardianAddresses.map((address, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '10px' 
              }}>
                <input
                  type="text"
                  placeholder={`Guardian ${index + 1} address (0x...)`}
                  value={address}
                  onChange={(e) => updateGuardianAddress(index, e.target.value)}
                  style={{ 
                    padding: '12px', 
                    flex: 1,
                    marginRight: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                  disabled={loading}
                />
                {guardianAddresses.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeGuardianField(index)}
                    style={{ 
                      background: '#dc3545', 
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={addGuardianField}
              style={{ 
                background: '#28a745', 
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              Add Another Guardian
            </button>
            
            <small style={{ color: '#666', display: 'block' }}>
              Add the addresses of guardians who will approve this recovery
            </small>
          </div>

          <button 
            type="submit" 
            disabled={loading || !newOwner}
            style={{
              padding: '15px 30px',
              background: loading ? '#ccc' : '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Proposing Recovery...' : 'Propose Recovery'}
          </button>
        </form>
      </div>

      <div style={{ 
        background: '#e7f3ff', 
        padding: '20px', 
        borderRadius: '8px' 
      }}>
        <h4>📋 How Recovery Works</h4>
        <ol>
          <li><strong>Propose Recovery:</strong> Submit a recovery request with your guardians</li>
          <li><strong>Guardian Approval:</strong> Guardians review and approve the recovery</li>
          <li><strong>Wait Period:</strong> 2-day delay for security</li>
          <li><strong>Execute Recovery:</strong> New owner gains control of the wallet</li>
        </ol>
        
        <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          <strong>Note:</strong> This is a demo implementation. In a production environment, 
          guardians would need to provide valid cryptographic signatures to approve recovery.
        </p>
      </div>
    </div>
  );
};

export default Recovery;
