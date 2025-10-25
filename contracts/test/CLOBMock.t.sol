// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {CLOBMock} from "./mocks/CLOBMock.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {Order} from "../contracts/types/CLOB.sol";

interface IPlace { function placeOrder(bytes calldata) external; }

contract CLOBMockTest {
    MockERC20 private base;
    MockERC20 private quote;
    CLOBMock private clob;
    error testFail(uint256 code);

    function setUp() public {
        base = new MockERC20("BASE","BSE");
        quote = new MockERC20("QUOTE","QTE");
        clob = new CLOBMock(address(base), address(quote));
        base.mint(address(this), 1_000 ether);
        quote.mint(address(this), 1_000 ether);
        base.approve(address(clob), type(uint256).max);
        quote.approve(address(clob), type(uint256).max);
    }

    function _place(Order memory o) internal {
        clob.placeOrder(abi.encode(o));
    }

    function testPlaceBuyStores() public {
        setUp();
        Order memory o = Order({
            id: 1,
            trader: address(this),
            baseToken: address(base),
            quoteToken: address(quote),
            isBuy: true,
            price: 2,
            amount: 10 ether,
            timestamp: block.timestamp
        });
        _place(o);
        Order[] memory buys = clob.getAllBuyOrders();
        if (buys.length != 1) revert testFail(1);
        if (!buys[0].isBuy) revert testFail(2);
    }

    function testPlaceSellStores() public {
        setUp();
        Order memory o = Order({
            id: 2,
            trader: address(this),
            baseToken: address(base),
            quoteToken: address(quote),
            isBuy: false,
            price: 5,
            amount: 4 ether,
            timestamp: block.timestamp
        });
        _place(o);
        Order[] memory sells = clob.getAllSellOrders();
        if (sells.length != 1) revert testFail(3);
        if (sells[0].isBuy) revert testFail(4);
    }

    function testMatchBuyTakesExistingSell() public {
        setUp();
        // seed a sell @ price 3 (amount 6)
        _place(Order({id:10,trader:address(this),baseToken:address(base),quoteToken:address(quote),isBuy:false,price:3,amount:6 ether,timestamp:block.timestamp}));
        uint256 baseBefore = base.balanceOf(address(this));
        uint256 quoteBefore = quote.balanceOf(address(this));
        // place buy @ price 4 amount 2 (should fill 2)
        _place(Order({id:11,trader:address(this),baseToken:address(base),quoteToken:address(quote),isBuy:true,price:4,amount:2 ether,timestamp:block.timestamp}));
        // After fill: we sold 2 base and bought 2 base back → net zero base, but quote changes? Actually as same address both sides, balances unchanged overall.
        // Assert residual sell amount 4 ether.
        Order[] memory sells = clob.getAllSellOrders();
        if (sells.length != 1) revert testFail(5);
        if (sells[0].amount != 4 ether) revert testFail(6);
        // balances remain the same because same trader both sides
        if (base.balanceOf(address(this)) != baseBefore) revert testFail(7);
        if (quote.balanceOf(address(this)) != quoteBefore) revert testFail(8);
    }

    function testFullCrossRemovesBoth() public {
        setUp();
        _place(Order({id:20,trader:address(this),baseToken:address(base),quoteToken:address(quote),isBuy:false,price:2,amount:5 ether,timestamp:block.timestamp}));
        _place(Order({id:21,trader:address(this),baseToken:address(base),quoteToken:address(quote),isBuy:true,price:3,amount:5 ether,timestamp:block.timestamp}));
        if (clob.getAllSellOrders().length != 0) revert testFail(9);
        if (clob.getAllBuyOrders().length != 0) revert testFail(10);
    }

    function testPartialThenAnotherBuyClears() public {
        setUp();
        _place(Order({id:30,trader:address(this),baseToken:address(base),quoteToken:address(quote),isBuy:false,price:3,amount:9 ether,timestamp:block.timestamp}));
        _place(Order({id:31,trader:address(this),baseToken:address(base),quoteToken:address(quote),isBuy:true,price:4,amount:4 ether,timestamp:block.timestamp})); // remaining sell 5
        if (clob.getAllSellOrders()[0].amount != 5 ether) revert testFail(11);
        _place(Order({id:32,trader:address(this),baseToken:address(base),quoteToken:address(quote),isBuy:true,price:5,amount:5 ether,timestamp:block.timestamp}));
        if (clob.getAllSellOrders().length != 0) revert testFail(12);
    }
}
