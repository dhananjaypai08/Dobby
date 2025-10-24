// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AddressBooleanMap} from "@arcologynetwork/concurrentlib/lib/map/AddressBoolean.sol";
import {Bytes} from "@arcologynetwork/concurrentlib/lib/array/Bytes.sol";
import {U256Cumulative} from "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";
import {Multiprocess} from "@arcologynetwork/concurrentlib/lib/multiprocess/Multiprocess.sol";
import {Order} from "./types/CLOB.sol";
import {Address} from "./constants/Address.sol";
import {ICLOB} from "./interfaces/ICLOB.sol";

/// @title Parallelized Execution for Central Limit Order Book (CLOB)
/// @author Dhananjay Pai
/// @notice Implements a fully on-chain order book for token trading with concurrent matching
/// @dev Uses custom concurrent data structures for order management
contract CLOB is Ownable, ReentrancyGuard, Address, ICLOB {
    Bytes private orderBook = new Bytes();
    U256Cumulative private totalOrders =
        new U256Cumulative(0, type(uint256).max);
    Bytes private buyOrders = new Bytes();
    U256Cumulative private totalbuyOrders =
        new U256Cumulative(0, type(uint256).max);
    Bytes private sellOrders = new Bytes();
    U256Cumulative private totalsellOrders =
        new U256Cumulative(0, type(uint256).max);
    mapping(address => Bytes) private userOrders;
    uint32 public constant GAS_LIMIT = 50_000;

    AddressBooleanMap public allowedTokens = new AddressBooleanMap();

    /// @notice Initializes the CLOB and sets allowed tokens
    constructor() Ownable() {
        allowedTokens.set(LAMAL, true);
        allowedTokens.set(ORIGAMI, true);
    }

    /// @dev Checks if a token is allowed for trading
    /// @param _token The token address to check
    function _isValidToken(address _token) internal {
        if (!allowedTokens.get(_token)) {
            revert TokenNotValid(_token);
        }
    }

    /// @dev Checks if a value is nonzero
    /// @param amount The value to check
    function _checkPrice(uint256 amount) internal pure {
        if (amount == 0) {
            revert ZeroValue();
        }
    }

    /// @notice Places a new order in the order book
    /// @dev Decodes the order, validates, and adds to the book
    /// @param _data ABI-encoded Order struct
    function placeOrder(bytes calldata _data) external nonReentrant {
        Order memory order = abi.decode(_data, (Order));
        _checkPrice(order.amount.get());
        _checkPrice(order.price);
        _isValidToken(order.baseToken);
        _isValidToken(order.quoteToken);

        orderBook.push(_data);
        totalOrders.add(1);
        if (order.isBuy) {
            totalbuyOrders.add(1);
            buyOrders.push(_data);
        } else {
            totalsellOrders.add(1);
            sellOrders.push(_data);
        }
        uint256 newIdx = order.isBuy
            ? totalbuyOrders.get() - 1
            : totalsellOrders.get() - 1;
        _parallelMatch(order.isBuy, newIdx, order.price, order.baseToken, order.quoteToken);
        userOrders[msg.sender].push(_data);
    }

    /// @dev Spawns parallel matching jobs for a new order using Multiprocess
    /// @param isBuy True if the new order is a buy order
    /// @param newIdx Index of the newly added order in its side array
    /// @param price Limit price of the new order
    /// @param baseToken Base token address
    /// @param quoteToken Quote token address
    function _parallelMatch(
        bool isBuy,
        uint256 newIdx,
        uint256 price,
        address baseToken,
        address quoteToken
    ) internal {
        uint256 opposingCount = isBuy ? totalsellOrders.get() : totalbuyOrders.get();
        if (opposingCount == 0) return;
        Multiprocess mp = new Multiprocess(opposingCount);
        for (uint256 i; i < opposingCount; ++i) {
            if (isBuy) {
                mp.addJob(
                    GAS_LIMIT,
                    0,
                    address(this),
                    abi.encodeWithSignature(
                        "_mpTryBuy(uint256,uint256,uint256,address,address)",
                        newIdx,
                        i,
                        price,
                        baseToken,
                        quoteToken
                    )
                );
            } else {
                mp.addJob(
                    GAS_LIMIT,
                    0,
                    address(this),
                    abi.encodeWithSignature(
                        "_mpTrySell(uint256,uint256,uint256,address,address)",
                        newIdx,
                        i,
                        price,
                        baseToken,
                        quoteToken
                    )
                );
            }
        }
        mp.run();
    }

    /// @notice Parallel job handler for a new buy order attempting to match a sell order
    function _mpTryBuy(
        uint256 buyIdx,
        uint256 sellIdx,
        uint256 buyPrice,
        address baseToken,
        address quoteToken
    ) public {
        if (sellIdx >= totalsellOrders.get()) return; // stale
        if (buyIdx >= totalbuyOrders.get()) return; // already filled
        Order memory buyOrder = abi.decode(buyOrders.get(buyIdx), (Order));
        Order memory sellOrder = abi.decode(sellOrders.get(sellIdx), (Order));
        if (
            sellOrder.price <= buyPrice &&
            buyOrder.amount.get() > 0 &&
            sellOrder.amount.get() > 0 &&
            sellOrder.baseToken == baseToken &&
            sellOrder.quoteToken == quoteToken
        ) {
            _fillOrder(buyIdx, sellIdx);
            if (sellOrder.amount.get() == 0) {
                sellOrders.set(
                    sellIdx,
                    sellOrders.get(totalsellOrders.get() - 1)
                );
                sellOrders.delLast();
                totalsellOrders.sub(1);
                totalOrders.sub(1);
            }
            if (buyOrder.amount.get() == 0) {
                buyOrders.set(
                    buyIdx,
                    buyOrders.get(totalbuyOrders.get() - 1)
                );
                buyOrders.delLast();
                totalbuyOrders.sub(1);
                totalOrders.sub(1);
            }
        }
    }

    /// @notice Parallel job handler for a new sell order attempting to match a buy order
    function _mpTrySell(
        uint256 sellIdx,
        uint256 buyIdx,
        uint256 sellPrice,
        address baseToken,
        address quoteToken
    ) public {
        if (buyIdx >= totalbuyOrders.get()) return;
        if (sellIdx >= totalsellOrders.get()) return;
        Order memory sellOrder = abi.decode(sellOrders.get(sellIdx), (Order));
        Order memory buyOrder = abi.decode(buyOrders.get(buyIdx), (Order));
        if (
            buyOrder.price >= sellPrice &&
            sellOrder.amount.get() > 0 &&
            buyOrder.amount.get() > 0 &&
            buyOrder.baseToken == baseToken &&
            buyOrder.quoteToken == quoteToken
        ) {
            _fillOrder(buyIdx, sellIdx);
            if (buyOrder.amount.get() == 0) {
                buyOrders.set(
                    buyIdx,
                    buyOrders.get(totalbuyOrders.get() - 1)
                );
                buyOrders.delLast();
                totalbuyOrders.sub(1);
                totalOrders.sub(1);
            }
            if (sellOrder.amount.get() == 0) {
                sellOrders.set(
                    sellIdx,
                    sellOrders.get(totalsellOrders.get() - 1)
                );
                sellOrders.delLast();
                totalsellOrders.sub(1);
                totalOrders.sub(1);
            }
        }
    }

    /// @dev Fills a matched buy and sell order, transfers tokens
    /// @param buyOrderIdx Index of the buy order
    /// @param sellOrderIdx Index of the sell order
    function _fillOrder(uint256 buyOrderIdx, uint256 sellOrderIdx) internal {
        Order memory buyOrder = abi.decode(buyOrders.get(buyOrderIdx), (Order));
        Order memory sellOrder = abi.decode(
            sellOrders.get(sellOrderIdx),
            (Order)
        );

        uint256 val = Math.min(buyOrder.amount.get(), sellOrder.amount.get());

        buyOrder.amount.sub(val);
        sellOrder.amount.sub(val);

        buyOrders.set(buyOrderIdx, abi.encode(buyOrder));
        sellOrders.set(sellOrderIdx, abi.encode(sellOrder));

        IERC20 baseToken = IERC20(buyOrder.baseToken);
        IERC20 quoteToken = IERC20(buyOrder.quoteToken);

        if (baseToken.balanceOf(sellOrder.trader) < val) {
            revert InsufficientBalance(sellOrder.trader, address(baseToken));
        }
        if (baseToken.allowance(sellOrder.trader, address(this)) < val) {
            revert NoAllowance(sellOrder.trader, address(this));
        }
        baseToken.transferFrom(sellOrder.trader, buyOrder.trader, val);

        if (quoteToken.balanceOf(buyOrder.trader) < val * sellOrder.price) {
            revert InsufficientBalance(buyOrder.trader, address(quoteToken));
        }
        if (
            quoteToken.allowance(buyOrder.trader, address(this)) <
            val * sellOrder.price
        ) {
            revert NoAllowance(buyOrder.trader, address(this));
        }
        quoteToken.transferFrom(
            buyOrder.trader,
            sellOrder.trader,
            val * sellOrder.price
        );

        emit OrderFill(buyOrder.trader, sellOrder.trader, val, block.timestamp);
    }

    /// @notice Returns all orders placed by a user
    /// @param user The address of the user
    /// @return Array of ABI-encoded Order structs
    function getUserOrders(address user) external returns (bytes[] memory) {
        Bytes container = userOrders[user];
        if (address(container) == address(0)) {
            return new bytes[](0);
        }
        uint256 len = container.nonNilCount();
        bytes[] memory out = new bytes[](len);
        for (uint256 i; i < len; ++i) {
            out[i] = container.get(i);
        }
        return out;
    }

    /// @notice Returns all buy orders in the book
    /// @return Array of ABI-encoded Order structs
    function getAllBuyOrders() external returns (bytes[] memory) {
        uint256 len = totalbuyOrders.get();
        bytes[] memory out = new bytes[](len);
        for (uint256 i; i < len; ++i) {
            out[i] = buyOrders.get(i);
        }
        return out;
    }

    /// @notice Returns all sell orders in the book
    /// @return Array of ABI-encoded Order structs
    function getAllSellOrders() external returns (bytes[] memory) {
        uint256 len = totalsellOrders.get();
        bytes[] memory out = new bytes[](len);
        for (uint256 i; i < len; ++i) {
            out[i] = sellOrders.get(i);
        }
        return out;
    }

    /// @notice Returns all orders in the book
    /// @return Array of ABI-encoded Order structs
    function getAllOrders() external returns (bytes[] memory) {
        uint256 len = totalOrders.get();
        bytes[] memory out = new bytes[](len);
        for (uint256 i; i < len; ++i) {
            out[i] = orderBook.get(i);
        }
        return out;
    }
}
