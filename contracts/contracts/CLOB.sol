// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {AddressBooleanMap} from "@arcologynetwork/concurrentlib/lib/map/AddressBoolean.sol";
import {Bytes} from "@arcologynetwork/concurrentlib/lib/array/Bytes.sol";
import {U256Cumulative} from "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";
import {Multiprocess} from "@arcologynetwork/concurrentlib/lib/multiprocess/Multiprocess.sol";
import {Order} from "./types/CLOB.sol";
import {Address} from "./constants/Address.sol";
import {ICLOB} from "./interfaces/ICLOB.sol";

/// @author Dhananjay Pai
/// @title Dobby - A parallel execution CLOB
/// @notice Fully on-chain order book supporting batched index-wise matching using Multiprocess jobs.
/// @dev Orders are stored unsorted in dynamic byte arrays; matching pairs are determined by shared index ranges (0..min(buys,sells)-1).
/// No explicit price-time priority; this simplified demonstrator pairs orders by positional index. Token transfers require prior allowances.
contract CLOB is Ownable, Address, ICLOB {
    /// @notice Encoded ABI orders (all orders, buy and sell)
    Bytes private orderBook = new Bytes();
    /// @notice Total number of orders ever appended minus removals (tracked cumulatively)
    U256Cumulative private totalOrders =
        new U256Cumulative(0, type(uint256).max);
    /// @notice Encoded buy-side orders
    Bytes private buyOrders = new Bytes();
    /// @notice Count of buy orders
    U256Cumulative private totalbuyOrders =
        new U256Cumulative(0, type(uint256).max);
    /// @notice Encoded sell-side orders
    Bytes private sellOrders = new Bytes();
    /// @notice Count of sell orders
    U256Cumulative private totalsellOrders =
        new U256Cumulative(0, type(uint256).max);
    /// @notice Per-user submitted raw encoded orders (historical list)
    mapping(address => bytes[]) private userOrders;
    /// @notice Gas limit used per matching pair job
    uint32 public constant GAS_LIMIT = 150_000;

    /// @notice Registry of tokens allowed for trading
    AddressBooleanMap public allowedTokens = new AddressBooleanMap();

    /// @notice Initializes allowed token set
    constructor() Ownable() {
        allowedTokens.set(LAMAL, true);
        allowedTokens.set(ORIGAMI, true);
    }

    /// @notice Reverts if token not whitelisted
    /// @param _token Token address to validate
    function _isValidToken(address _token) internal {
        if (!allowedTokens.get(_token)) revert TokenNotValid(_token);
    }

    /// @notice Ensures non-zero numeric input
    /// @param amount Value to verify
    function _checkPrice(uint256 amount) internal pure {
        if (amount == 0) revert ZeroValue();
    }

    /// @notice Place a new order (buy or sell) encoded as an Order struct
    /// @param _data ABI encoded Order
    function placeOrder(bytes calldata _data) external {
        Order memory order = abi.decode(_data, (Order));
        _checkPrice(order.amount);
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

        userOrders[msg.sender].push(_data);
    }

    /// @notice Launch parallel jobs to attempt matching for the first min(buys,sells) index pairs
    function matchOrders() external {
        uint256 buyLen = totalbuyOrders.get();
        uint256 sellLen = totalsellOrders.get();
        uint256 pairs = Math.min(buyLen, sellLen);
        if (pairs == 0) return;
        Multiprocess mp = new Multiprocess(pairs);
        for (uint256 i = 0; i < pairs; ++i) {
            mp.addJob(
                GAS_LIMIT,
                0,
                address(this),
                abi.encodeWithSignature("matchPair(uint256,uint256)", i, i)
            );
        }
        mp.run();
    }

    /// @notice Try to match a specific buy index against a sell index; transfers assets on success and emits fill event
    /// @param buyIdx Index in buyOrders array
    /// @param sellIdx Index in sellOrders array
    function matchPair(uint256 buyIdx, uint256 sellIdx) public {
        if (buyIdx >= totalbuyOrders.get() || sellIdx >= totalsellOrders.get())
            return;
        Order memory buyOrder = abi.decode(buyOrders.get(buyIdx), (Order));
        Order memory sellOrder = abi.decode(sellOrders.get(sellIdx), (Order));
        if (buyOrder.amount == 0 || sellOrder.amount == 0) return;
        if (
            buyOrder.price >= sellOrder.price &&
            buyOrder.baseToken == sellOrder.baseToken &&
            buyOrder.quoteToken == sellOrder.quoteToken
        ) {
            uint256 fillAmount = Math.min(buyOrder.amount, sellOrder.amount);
            buyOrder.amount -= fillAmount;
            sellOrder.amount -= fillAmount;
            buyOrders.set(buyIdx, abi.encode(buyOrder));
            sellOrders.set(sellIdx, abi.encode(sellOrder));
            IERC20(buyOrder.baseToken).transferFrom(
                sellOrder.trader,
                buyOrder.trader,
                fillAmount
            );
            IERC20(buyOrder.quoteToken).transferFrom(
                buyOrder.trader,
                sellOrder.trader,
                fillAmount * sellOrder.price
            );
            emit OrderFill(
                buyOrder.trader,
                sellOrder.trader,
                fillAmount,
                block.timestamp
            );
        }
    }

    /// @notice Return all encoded orders submitted by a user
    /// @param user Address of trader
    /// @return Array of ABI encoded orders
    function getUserOrders(
        address user
    ) external view returns (bytes[] memory) {
        return userOrders[user];
    }

    /// @notice Return all current buy orders (encoded)
    /// @return Array of encoded orders
    function getAllBuyOrders() external returns (bytes[] memory) {
        uint256 len = totalbuyOrders.get();
        bytes[] memory out = new bytes[](len);
        for (uint256 i; i < len; ++i) out[i] = buyOrders.get(i);
        return out;
    }

    /// @notice Return all current sell orders (encoded)
    /// @return Array of encoded orders
    function getAllSellOrders() external returns (bytes[] memory) {
        uint256 len = totalsellOrders.get();
        bytes[] memory out = new bytes[](len);
        for (uint256 i; i < len; ++i) out[i] = sellOrders.get(i);
        return out;
    }

    /// @notice Return all orders (buy + sell) in raw encoded form
    /// @return Array of encoded orders
    function getAllOrders() external returns (bytes[] memory) {
        uint256 len = totalOrders.get();
        bytes[] memory out = new bytes[](len);
        for (uint256 i; i < len; ++i) out[i] = orderBook.get(i);
        return out;
    }
}
