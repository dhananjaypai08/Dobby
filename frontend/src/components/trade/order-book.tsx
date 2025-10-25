"use client"

import { useOrderBook } from "../../hooks/useCLOB"

interface OrderBookProps {
  tokenPair: "LAMAL" | "ORIGAMI"
}

export function OrderBookPanel({ tokenPair }: OrderBookProps) {
  const { orderBook, loading, error } = useOrderBook(5000) // Refresh every 5 seconds

  if (loading && orderBook.buyOrders.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Order Book</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading order book...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Order Book</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading order book: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Order Book</h3>
        {loading && (
          <span className="text-xs text-muted-foreground animate-pulse">Updating...</span>
        )}
      </div>

      <div className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-3 gap-4 text-xs font-medium text-muted-foreground pb-2 border-b">
          <div>Price (USD)</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Total (USD)</div>
        </div>

        {/* Sell Orders (Ask) */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-destructive mb-2">Sell Orders</div>
          {orderBook.sellOrders.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No sell orders
            </div>
          ) : (
            <div className="space-y-1">
              {orderBook.sellOrders.slice(0, 10).map((order, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-4 text-sm hover:bg-muted/50 p-1 rounded transition-colors"
                >
                  <div className="text-destructive font-mono">{parseFloat(order.price).toFixed(2)}</div>
                  <div className="text-right font-mono">{parseFloat(order.amount).toFixed(4)}</div>
                  <div className="text-right font-mono">{order.total}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Price Indicator */}
        <div className="py-3 text-center border-y">
          <div className="text-2xl font-bold font-mono">
            {orderBook.sellOrders.length > 0 && orderBook.buyOrders.length > 0
              ? `$${((parseFloat(orderBook.sellOrders[orderBook.sellOrders.length - 1]?.price || "0") +
                  parseFloat(orderBook.buyOrders[0]?.price || "0")) /
                2).toFixed(2)}`
              : orderBook.sellOrders.length > 0
              ? `$${parseFloat(orderBook.sellOrders[orderBook.sellOrders.length - 1].price).toFixed(2)}`
              : orderBook.buyOrders.length > 0
              ? `$${parseFloat(orderBook.buyOrders[0].price).toFixed(2)}`
              : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Current Spread</div>
        </div>

        {/* Buy Orders (Bid) */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-green-500 mb-2">Buy Orders</div>
          {orderBook.buyOrders.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No buy orders
            </div>
          ) : (
            <div className="space-y-1">
              {orderBook.buyOrders.slice(0, 10).map((order, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 gap-4 text-sm hover:bg-muted/50 p-1 rounded transition-colors"
                >
                  <div className="text-green-500 font-mono">{parseFloat(order.price).toFixed(2)}</div>
                  <div className="text-right font-mono">{parseFloat(order.amount).toFixed(4)}</div>
                  <div className="text-right font-mono">{order.total}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empty State */}
        {orderBook.buyOrders.length === 0 && orderBook.sellOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No orders in the book</p>
            <p className="text-sm text-muted-foreground">Be the first to place an order!</p>
          </div>
        )}
      </div>
    </div>
  )
}