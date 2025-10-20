// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICLOB {
    error TokenNotValid(address token);
    error ZeroValue();
    error NoAllowance(address owner, address spender);
    error InsufficientBalance(address user, address token);

    event OrderFill(address buyer, address seller, uint256 amount, uint256 timestamp);
}