// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import { U256Cumulative } from "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";

struct Order {
    uint256 id;
    address trader;
    address baseToken;      // Token being bought or sold
    address quoteToken;     // Token used for pricing (e.g., USDC)
    bool isBuy;             // true = buy order, false = sell order
    uint256 price;          // price per base token, in quoteToken units
    U256Cumulative amount;         // total amount of base token desired/offered
    uint256 timestamp;
}