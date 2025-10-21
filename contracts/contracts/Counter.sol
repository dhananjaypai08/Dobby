// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {U256Cumulative} from "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";

contract Counter {
    U256Cumulative public total = new U256Cumulative(0, type(uint256).max);

    event Increment(uint by);

    function inc() public {
        total.add(1);
        emit Increment(1);
    }

    function incBy(uint by) public {
        require(by > 0, "incBy: increment should be positive");
        total.add(by);
        emit Increment(by);
    }
}
