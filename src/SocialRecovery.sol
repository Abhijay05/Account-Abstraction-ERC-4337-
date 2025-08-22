// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;



import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IAccount,ACCOUNT_VALIDATION_SUCCESS_MAGIC } from "lib/foundry-era-contracts/src/system-contracts/contracts/interfaces/IAccount.sol";
import { Transaction, MemoryTransactionHelper} from "lib/foundry-era-contracts/src/system-contracts/contracts/libraries/MemoryTransactionHelper.sol";
import {SystemContractsCaller} from
    "lib/foundry-era-contracts/src/system-contracts/contracts/libraries/SystemContractsCaller.sol";
import {
    NONCE_HOLDER_SYSTEM_CONTRACT,
    BOOTLOADER_FORMAL_ADDRESS,
    DEPLOYER_SYSTEM_CONTRACT
} from "lib/foundry-era-contracts/src/system-contracts/contracts/Constants.sol";
import {INonceHolder} from "lib/foundry-era-contracts/src/system-contracts/contracts/interfaces/INonceHolder.sol";
import {Utils} from "lib/foundry-era-contracts/src/system-contracts/contracts/libraries/Utils.sol";

// OZ Imports
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";








contract SocialRecovery is IAccount, Ownable, ReentrancyGuard {
    using MemoryTransactionHelper for Transaction;
    using ECDSA for bytes32;
    bool public isFrozen;
    uint256 public dailySpendLimit = 1 ether;
    uint256 public nonce;
    uint256 public totalGuardianWeight;
    uint256 public guardianThreshold = (totalGuardianWeight * 60) / 100;


    error ZkMinimalAccount__NotFromBootLoader();
    error ZkMinimalAccount__NotFromBootLoaderOrOwner();
    error ZkMinimalAccount__FailedToPay();
    error ZkMinimalAccount__InvalidSignature();
    error ZkMinimalAccount__ExecutionFailed();
    error ZkMinimalAccount__NotEnoughBalance();

    modifier requireFromBootLoader(){
        if(msg.sender != BOOTLOADER_FORMAL_ADDRESS) {
            revert ZkMinimalAccount__NotFromBootLoader();
        }
        _;
    }

    modifier requireFromBootLoaderOrOwner(){
        require(msg.sender == BOOTLOADER_FORMAL_ADDRESS || msg.sender == owner(), "Not from Bootloader or Owner");
        _;
    }
    
    modifier notFrozen() {
        require(!isFrozen, "Account is frozen");
        _;
    }
    
    modifier respectsDailyLimit(uint256 amount) {
        uint256 today = block.timestamp / 1 days;
        require(dailySpent[today] + amount <= dailySpendLimit, "Daily limit exceeded");
        dailySpent[today] += amount;
        _;
    }

    

    receive() external payable {}
    
    struct Guardian {
        address addr;
        bool isActive;
        uint256 addedAt;
        uint256 weight;
    }

    address[] public guardianList;
     // Recovery system
    struct RecoveryRequest {
        address proposedOwner;
        uint256 requestedAt;
        mapping(address => bool) hasApproved;
        bool executed;
        bool cancelled;
    }    
    
    uint256 public constant RECOVERY_DELAY = 2 days;

    //features 
    
    mapping(address => Guardian) public guardians;
    mapping(bytes32 => RecoveryRequest) public recoveryRequests;
    mapping(uint256 => uint256) public dailySpent;
    mapping(bytes4 => uint256) public functionDelays;
    mapping(address => bool) public frozenBy;
   
    // events 
    // Events
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event RecoveryProposed(bytes32 indexed recoveryId, address indexed newOwner, uint256 executeAfter);
    event RecoveryExecuted(bytes32 indexed recoveryId, address indexed oldOwner, address indexed newOwner);
    event RecoveryCancelled(bytes32 indexed recoveryId);
    event AccountFrozen(address indexed freezer);
    event AccountUnfrozen();


    constructor() Ownable(msg.sender){}

    // helper functions 
    function getRecoveryHash(address newOwner, uint256 nonce) public view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19\x01",
            block.chainid,
            address(this),
            newOwner,
            nonce,
            "RECOVERY"
        ));
    }

    function addGuardian(address _guardian, uint256 weight) external onlyOwner {
        _addGuardian(_guardian, weight);
    }

    function _addGuardian(address _guardian, uint256 weight) internal{
        require(_guardian != address(0) && _guardian != owner(), "Invalid guardian");
        require(!guardians[_guardian].isActive, "Guardian already exists");
        guardians[_guardian] = Guardian({
            addr: _guardian,
            isActive: true,
            addedAt: block.timestamp,
            weight: weight
        });
        guardianList.push(_guardian);
        totalGuardianWeight += weight;  
        emit GuardianAdded(_guardian);
    }

     function removeGuardian(address _guardian) external onlyOwner {
        require(guardians[_guardian].isActive, "Guardian not found");
        
        guardians[_guardian].isActive = false;
        totalGuardianWeight -= guardians[_guardian].weight;
        
        
       
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardianList[i] == _guardian) {
                guardianList[i] = guardianList[guardianList.length - 1];
                guardianList.pop();
                break;
            }
        }
        
        emit GuardianRemoved(_guardian);
    }

    // recovery logic
    function _validateRecoveryProposal(bytes32 txHash, Transaction calldata _transaction) internal returns(bytes4){
         (, address newOwner, bytes memory guardianSignatures) = abi.decode(
            _transaction.data[4:], 
            (bytes32, address, bytes)
        );    
        
        bytes32 recoveryHash = getRecoveryHash(newOwner, _transaction.nonce);
        uint256 approvalWeight = _validateGuardianSignatures(recoveryHash, guardianSignatures);
        
        SystemContractsCaller.systemCallWithPropagatedRevert(
            uint32(gasleft()),
            address(NONCE_HOLDER_SYSTEM_CONTRACT),
            0,
            abi.encodeCall(INonceHolder.incrementMinNonceIfEquals, (_transaction.nonce))
        );
        if(approvalWeight >= guardianThreshold){
        return ACCOUNT_VALIDATION_SUCCESS_MAGIC;
        } else return bytes4(0);

    }
    
    function _validateGuardianSignatures(
    bytes32 recoveryHash,
    bytes memory signatures
) internal view returns (uint256 totalWeight) {
    uint256 len = signatures.length;
    require(len % 65 == 0 && len != 0, "Invalid signatures length");

    uint256 n = len / 65;
    address prevSigner = address(0);

    for (uint256 i = 0; i < n; ++i) {
        uint256 off = 32 + i * 65; // skip bytes length word

        bytes32 r;
        bytes32 s;
        uint8 v;

        // load r, s, v directly from memory (signatures is bytes in memory)
        assembly {
            r := mload(add(signatures, off))
            s := mload(add(signatures, add(off, 32)))
            v := byte(0, mload(add(signatures, add(off, 64))))
        }
        // normalize v if it's 0/1
        if (v < 27) v += 27;

        address signer = ECDSA.recover(recoveryHash, v, r, s);

        // strictly increasing signer addresses => prevents duplicates & enforces sorting
        require(signer > prevSigner, "Unsorted or duplicate signer");
        prevSigner = signer;

        Guardian storage g = guardians[signer];
        require(g.isActive, "Signer not guardian");
        totalWeight += g.weight;
    }
}

    function _validateRecoveryExecution(bytes32 txHash, Transaction calldata _transaction) 
        internal pure returns (bytes4) {
        // Anyone can execute a valid recovery after the delay period
        // The actual validation happens in the executeRecovery function
        
        return ACCOUNT_VALIDATION_SUCCESS_MAGIC;
    }

    // management

    function proposeRecovery(
        bytes32 recoveryId,
        address newOwner,
        bytes calldata guardianSignatures
    ) external {
        // This can only be called through AA validation
        require(msg.sender == address(this), "Must go through AA validation");
        
        RecoveryRequest storage request = recoveryRequests[recoveryId];
        request.proposedOwner = newOwner;
        request.requestedAt = block.timestamp;
        
        // The validation already confirmed sufficient guardian signatures
        // So we can proceed with the proposal
        emit RecoveryProposed(recoveryId, newOwner, block.timestamp + RECOVERY_DELAY);
    }

    function executeRecovery(bytes32 recoveryId) external {
        RecoveryRequest storage request = recoveryRequests[recoveryId];
        
        require(request.proposedOwner != address(0), "Recovery not found");
        require(!request.executed && !request.cancelled, "Recovery not available");
        require(block.timestamp >= request.requestedAt + RECOVERY_DELAY, "Recovery delay not passed");
        
        address oldOwner = owner();
        _transferOwnership(request.proposedOwner);
        request.executed = true;
        
        emit RecoveryExecuted(recoveryId, oldOwner, request.proposedOwner);
    }
     function cancelRecovery(bytes32 recoveryId) external onlyOwner {
        recoveryRequests[recoveryId].cancelled = true;
    }


    
    
    // NATIVE AA

    
    function validateTransaction (
        bytes32, /*_txHash*/ bytes32, /*_suggestedSignedHash*/ 
        Transaction calldata _transaction) 
        external payable override requireFromBootLoader 
        returns( bytes4 magic){
           return(_validateTransaction(_transaction));
    }
    
    function executeTransaction (bytes32, /*_txHash*/ bytes32, /*_suggestedSignedHash*/ Transaction memory _transaction)
        external
        payable override
        requireFromBootLoaderOrOwner
    { 
        _executeTransaction(_transaction);
    }

    function executeTransactionFromOutside(
        
        Transaction calldata _transaction
    ) external payable override {
        bytes4 magic = _validateTransaction(_transaction);
        if(magic != ACCOUNT_VALIDATION_SUCCESS_MAGIC) {
            revert ZkMinimalAccount__InvalidSignature();
        }
        _executeTransaction(_transaction);
    }
    
    function payForTransaction (
        bytes32, /*_txHash*/
        bytes32, /*_suggestedSignedHash*/
        Transaction calldata _transaction
    ) external payable override {
        bool success = _transaction.payToTheBootloader();
        if (!success) {
            revert ZkMinimalAccount__FailedToPay();
        }
    } 
    function prepareForPaymaster (bytes32 _txHash, bytes32 _possibleSignedHash, Transaction calldata _transaction)
        external
        payable override {}

    
    function _validateTransaction(Transaction calldata _transaction) 
    internal returns(bytes4 magic){
         SystemContractsCaller.systemCallWithPropagatedRevert(
            uint32(gasleft()),
            address(NONCE_HOLDER_SYSTEM_CONTRACT),
            0,
            abi.encodeCall(INonceHolder.incrementMinNonceIfEquals, (_transaction.nonce))
        );

      
        uint256 totalRequiredBalance = _transaction.totalRequiredBalance();
        if (totalRequiredBalance > address(this).balance) {
            revert ZkMinimalAccount__NotEnoughBalance();
        }

        bytes32 txHash = _transaction.encodeHash();
        address signer = ECDSA.recover(txHash, _transaction.signature);
        bool isValidSigner = signer == owner();
        bytes4 selector = bytes4(_transaction.data[:4]);

        if (selector == this.proposeRecovery.selector) {
            return _validateRecoveryProposal(txHash, _transaction);
        } else if (selector == this.executeRecovery.selector) {
            return _validateRecoveryExecution(txHash, _transaction);
        } else {if(isValidSigner){
            magic = ACCOUNT_VALIDATION_SUCCESS_MAGIC;
        } else {
            magic = bytes4(0);
        }
        }
        return magic;
    } 

    function _executeTransaction(Transaction memory _transaction) internal {
        address to = address(uint160(_transaction.to));
        uint128 value = Utils.safeCastToU128(_transaction.value);
        bytes memory data = _transaction.data;
        if (to== address(DEPLOYER_SYSTEM_CONTRACT)){
            uint32 gas = Utils.safeCastToU32(gasleft());
            SystemContractsCaller.systemCallWithPropagatedRevert( gas, to, value, data);
        } else {
            bool success;
            assembly{
                success := call(gas(), to, value , add(data, 0x20), mload(data),0,0)
            }
             if (!success) {
                revert ZkMinimalAccount__ExecutionFailed();
             }

        }
    }
} 


