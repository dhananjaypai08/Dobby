// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Simple ERC20 Token
/// @notice Basic ERC20 token with Ownable and initial supply
/// @author Dhananjay Pai
contract Token is ERC20, Ownable {
    /// @notice Deploys the token and mints initial supply
    /// @param _name Name of the token
    /// @param _symbol Symbol of the token
    /// @param _initialSupply Initial supply to mint
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        _mint(msg.sender, _initialSupply);
    }
}
