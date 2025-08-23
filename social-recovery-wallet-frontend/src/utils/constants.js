// src/utils/constants.js

// Your deployed contract address (replace with actual address when deployed)
export const CONTRACT_ADDRESS = "0xA4013fc51BF1b811962ff15dae1e7645746eeAFc";

// Your complete contract ABI (from the paste.txt file)
export const CONTRACT_ABI = [
  // Constructor
  "constructor()",
  
  // Owner functions (from OpenZeppelin Ownable)
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
  "function renounceOwnership()",
  
  // Guardian functions
  "function addGuardian(address _guardian, uint256 weight)", 
  "function removeGuardian(address _guardian)",
  "function guardians(address) view returns (address addr, bool isActive, uint256 addedAt)",
  "function guardianList(uint256) view returns (address)",
  "function getGuardianCount() view returns (uint256)",
  
  // Recovery functions
  "function proposeRecovery(address newOwner, address[] calldata guardianAddresses, bytes[] calldata guardianSignatures)",
  
  // Constants
  "function RECOVERY_DELAY() view returns (uint256)",
  "function dailySpendLimit() view returns (uint256)",
  
  // Events
  "event GuardianAdded(address indexed guardian)",
  "event GuardianRemoved(address indexed guardian)",
  "event RecoveryProposed(bytes32 indexed recoveryId, address indexed newOwner, uint256 executeAfter)"
];


// Network Configuration for zkSync Era
export const NETWORK_CONFIG = {
  chainId: '0x12C', // zkSync Era Sepolia (300 in decimal)
  chainName: 'zkSync Era Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://sepolia.era.zksync.dev'],
  blockExplorerUrls: ['https://sepolia.explorer.zksync.io']
};

// Time Constants
export const RECOVERY_DELAY = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
export const DEFAULT_DAILY_LIMIT = '1.0'; // 1 ETH

// UI Constants
export const ITEMS_PER_PAGE = 10;
export const DEBOUNCE_DELAY = 300;
