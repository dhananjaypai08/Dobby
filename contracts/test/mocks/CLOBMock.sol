// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Order} from "../../contracts/types/CLOB.sol";

/// @notice Simplified non-concurrent CLOB harness for local testing of core semantics
contract CLOBMock {
    error TokenNotAllowed(address token);
    error ZeroValue();

    IERC20 public immutable BASE_TOKEN;
    IERC20 public immutable QUOTE_TOKEN;

    Order[] private buyOrders; // encoded as struct array for simplicity
    Order[] private sellOrders;
    mapping(address => Order[]) private userOrders;

    event OrderPlaced(uint256 id, bool isBuy);
    event OrderFill(address buyer, address seller, uint256 amount, uint256 price);

    constructor(address _base, address _quote) {
        BASE_TOKEN = IERC20(_base);
        QUOTE_TOKEN = IERC20(_quote);
    }

    function placeOrder(bytes calldata data) external {
        Order memory o = abi.decode(data, (Order));
        if (o.amount == 0 || o.price == 0) revert ZeroValue();
        if (o.baseToken != address(BASE_TOKEN) || o.quoteToken != address(QUOTE_TOKEN)) {
            revert TokenNotAllowed(o.baseToken);
        }
        if (o.trader == address(0)) o.trader = msg.sender;
        if (o.isBuy) {
            buyOrders.push(o);
            _tryMatchBuy(buyOrders.length - 1);
        } else {
            sellOrders.push(o);
            _tryMatchSell(sellOrders.length - 1);
        }
        userOrders[o.trader].push(o);
        emit OrderPlaced(o.id, o.isBuy);
    }

    function _tryMatchBuy(uint256 buyIdx) internal {
        Order storage b = buyOrders[buyIdx];
        // iterate sells for best price <= buy price (linear for harness)
        for (uint256 i; i < sellOrders.length && b.amount > 0; ) {
            Order storage s = sellOrders[i];
            if (s.price <= b.price && s.amount > 0) {
                uint256 traded = b.amount < s.amount ? b.amount : s.amount;
                _settle(b.trader, s.trader, traded, s.price);
                b.amount -= traded;
                s.amount -= traded;
                emit OrderFill(b.trader, s.trader, traded, s.price);
                if (s.amount == 0) {
                    sellOrders[i] = sellOrders[sellOrders.length - 1];
                    sellOrders.pop();
                    continue; // do not i++ here; new element at i
                }
            }
            unchecked { ++i; }
        }
        if (b.amount == 0) {
            buyOrders[buyIdx] = buyOrders[buyOrders.length - 1];
            buyOrders.pop();
        }
    }

    function _tryMatchSell(uint256 sellIdx) internal {
        Order storage s = sellOrders[sellIdx];
        for (uint256 i; i < buyOrders.length && s.amount > 0; ) {
            Order storage b = buyOrders[i];
            if (b.price >= s.price && b.amount > 0) {
                uint256 traded = b.amount < s.amount ? b.amount : s.amount;
                _settle(b.trader, s.trader, traded, s.price);
                b.amount -= traded;
                s.amount -= traded;
                emit OrderFill(b.trader, s.trader, traded, s.price);
                if (b.amount == 0) {
                    buyOrders[i] = buyOrders[buyOrders.length - 1];
                    buyOrders.pop();
                    continue;
                }
            }
            unchecked { ++i; }
        }
        if (s.amount == 0) {
            sellOrders[sellIdx] = sellOrders[sellOrders.length - 1];
            sellOrders.pop();
        }
    }

    function _settle(address buyer, address seller, uint256 amount, uint256 price) internal {
        // buyer pays quote, seller transfers base
        if (amount == 0) return;
        BASE_TOKEN.transferFrom(seller, buyer, amount);
        QUOTE_TOKEN.transferFrom(buyer, seller, amount * price);
    }

    function getAllBuyOrders() external view returns (Order[] memory) { return buyOrders; }
    function getAllSellOrders() external view returns (Order[] memory) { return sellOrders; }
    function getUserOrders(address u) external view returns (Order[] memory) { return userOrders[u]; }
}
