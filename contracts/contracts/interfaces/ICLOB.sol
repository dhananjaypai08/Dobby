// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title CLOB Interface
/// @notice Interface for the Central Limit Order Book contract
/// @author Dhananjay Pai
interface ICLOB {
    /// @notice Thrown when a token is not valid
    error TokenNotValid(address token);
    /// @notice Thrown when a value is zero
    error ZeroValue();
    /// @notice Thrown when allowance is insufficient
    error NoAllowance(address owner, address spender);
    /// @notice Thrown when balance is insufficient
    error InsufficientBalance(address user, address token);

    /// @notice Emitted when an order is filled
    event OrderFill(address indexed buyer, address indexed seller, uint256 amount, uint256 timestamp);

    /// @notice Place a new order
    /// @param _data ABI-encoded Order struct
    function placeOrder(bytes calldata _data) external;
    /// @notice Get all orders for a user
    /// @param user The address of the user
    /// @return Array of ABI-encoded Order structs
    function getUserOrders(address user) external returns (bytes[] memory);
    /// @notice Get all buy orders
    /// @return Array of ABI-encoded Order structs
    function getAllBuyOrders() external returns (bytes[] memory);
    /// @notice Get all sell orders
    /// @return Array of ABI-encoded Order structs
    function getAllSellOrders() external returns (bytes[] memory);
    /// @notice Get all orders
    /// @return Array of ABI-encoded Order structs
    function getAllOrders() external returns (bytes[] memory);
}