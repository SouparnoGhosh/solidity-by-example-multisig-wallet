//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

contract MultiSigWallet {
    // Events
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed sender, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed sender, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed sender, uint256 indexed txIndex);

    // Variables
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    // txIndex => owner => confirmation of transaction
    mapping(uint256 => mapping(address => bool)) public isTransactionConfirmed;
    Transaction[] public transactions;

    // modifiers
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Must be owner");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "Tx doesnt exist");
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        require(!isTransactionConfirmed[_txIndex][msg.sender], "Tx confirmed");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Tx not executed");
        _;
    }

    // constructor
    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, "Owners required");
        require(
            _numConfirmationsRequired > 0 &&
                _numConfirmationsRequired <= _owners.length,
            "num confirmations reqd invalid"
        );
        for (uint256 i = 0; i < _owners.length; i++) {
            address _owner = _owners[i];
            require(!isOwner[_owner], "owner present");
            require(_owner != address(0), "give valid address");
            isOwner[_owner] = true;
            owners.push(_owner);
        }
        numConfirmationsRequired = _numConfirmationsRequired;
    }

    // receive
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // submit, confirm, execute, revoke transactions
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public onlyOwner {
        uint256 _txIndex = transactions.length;
        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );
        emit SubmitTransaction(msg.sender, _txIndex, _to, _value, _data);
    }

    function confirmTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notConfirmed(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isTransactionConfirmed[_txIndex][msg.sender] = true;
        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function executeTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notConfirmed(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "Not enough confirmations"
        );
        transaction.executed = true;
        //solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "Transaction failed");
        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    function revokeConfirmation(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notConfirmed(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations -= 1;
        isTransactionConfirmed[_txIndex][msg.sender] = false;
        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    // get owners, transactions count, transaction
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(uint256 _txIndex)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
}
