// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { CLOB } from "../contracts/CLOB.sol";
import { Test } from "forge-std/Test.sol";
import { U256Cumulative } from "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";

contract CLOBTest is Test {
    CLOB private clob;

    function setUp() public {
        clob = new CLOB();
    }

    function test_PlaceOrder_RevertsOnInvalidToken() public {
        // Prepare an order with an invalid token address
        U256Cumulative amount = new U256Cumulative(10, type(uint256).max);
        bytes memory order = abi.encode(
            1, // id
            address(this), // trader
            address(0xdead), // baseToken (invalid)
            address(0xdead), // quoteToken (invalid)
            true, // isBuy
            100, // price
            address(amount), // U256Cumulative contract address
            block.timestamp // timestamp
        );
        vm.expectRevert();
        clob.placeOrder(order);
    }

    function test_PlaceOrder_RevertsOnZeroAmount() public {
        // Prepare an order with zero amount
        U256Cumulative amount = new U256Cumulative(0, type(uint256).max);
        bytes memory order = abi.encode(
            1,
            address(this),
            clob.LAMAL(),
            clob.ORIGAMI(),
            true,
            100,
            address(amount), // U256Cumulative contract address
            block.timestamp
        );
        vm.expectRevert();
        clob.placeOrder(order);
    }

    function test_PlaceOrder_SucceedsWithValidOrder() public {
        // Prepare a valid order
        U256Cumulative amount = new U256Cumulative(10, type(uint256).max);
        bytes memory order = abi.encode(
            1,
            address(this),
            clob.LAMAL(),
            clob.ORIGAMI(),
            true,
            100,
            address(amount), // U256Cumulative contract address
            block.timestamp
        );
        clob.placeOrder(order);
        // If no revert, test passes
    }
}
