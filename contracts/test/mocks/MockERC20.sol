// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Minimal mintable ERC20 token for test harness usage (not production safe)
contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public immutable DECIMALS = 18;
    uint256 public override totalSupply;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(string memory _n, string memory _s) {
        name = _n; symbol = _s;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        _move(msg.sender, to, value); return true;
    }
    function approve(address spender, uint256 value) public override returns (bool) {
        allowance[msg.sender][spender] = value; emit Approval(msg.sender, spender, value); return true;
    }
    error Allowance();
    error Balance();

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < value) revert Allowance();
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _move(from, to, value); return true;
    }
    function mint(address to, uint256 value) external {
        totalSupply += value; balanceOf[to] += value; emit Transfer(address(0), to, value);
    }
    function _move(address from, address to, uint256 value) internal {
        if (balanceOf[from] < value) revert Balance();
        balanceOf[from] -= value; balanceOf[to] += value; emit Transfer(from, to, value);
    }
}
