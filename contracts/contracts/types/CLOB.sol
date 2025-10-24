// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { U256Cumulative } from "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";

/// @title Order Struct for CLOB
/// @notice Represents an order in the CLOB
/// @author Dhananjay Pai
struct Order {
    /// @notice Unique order id
    uint256 id;
    /// @notice Address of the trader
    address trader;
    /// @notice Token being bought or sold
    address baseToken;
    /// @notice Token used for pricing (e.g., USDC)
    address quoteToken;
    /// @notice true = buy order, false = sell order
    bool isBuy;
    /// @notice price per base token, in quoteToken units
    uint256 price;
    /// @notice total amount of base token desired/offered
    U256Cumulative amount;
    /// @notice order creation timestamp
    uint256 timestamp;
}