// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Counter} from "./Counter.sol";
import {Test} from "forge-std/Test.sol";

// Solidity tests are compatible with foundry, so they
// use the same syntax and offer the same functionality.

contract CounterTest is Test {
    Counter private counter;

    function setUp() public {
        counter = new Counter();
    }

    function test_InitialValue() public view {
        assertEq(counter.total().get(), 0, "Initial value should be 0");
    }

    function testFuzz_Inc(uint256 x) public {
        for (uint256 i = 0; i < x; i++) {
            counter.inc();
        }
        assertEq(
            counter.total().get(),
            x,
            "Value after calling inc x times should be x"
        );
    }

    function test_IncByZero() public {
        vm.expectRevert();
        counter.incBy(0);
    }
}
