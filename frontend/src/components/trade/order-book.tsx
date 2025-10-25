"use client"

import { useEffect, useState } from "react"
import { formatNumber } from "../../lib/utils"
import { type OrderBookEntry } from "../../types"

export function OrderBook() {
  const [buyOrders, setBuyOrders] = useState<OrderBookEntry[]>([])
  const [sellOrders, setSellOrders] = useState<OrderBookEntry[]>([])

  // Mock data for demonstration
  useEffect(() => {
    const mockBuyOrders: OrderBookEntry[] = [
      { price: "2450.50", amount: "1.5", total: "3675.75", timestamp: Date.now() },
      { price: "2450.00", amount: "2.3", total: "5635.00", timestamp: Date.now() },
      { price: "2449.50", amount: "0.8", total: "1959.60", timestamp: Date.now() },
      { price: "2449.00", amount: "3.1", total: "7591.90", timestamp: Date.now() },
      { price: "2448.50", amount: "1.2", total: "2938.20", timestamp: Date.now() },
    ]

    const mockSellOrders: OrderBookEntry[] = [
      { price: "2451.00", amount: "1.8", total: "4411.80", timestamp: Date.now() },
      { price: "2451.50", amount: "2.1", total: "5148.15", timestamp: Date.now() },
      { price: "2452.00", amount: "0.9", total: "2206.80", timestamp: Date.now() },
      { price: "2452.50", amount: "3.4", total: "8338.50", timestamp: Date.now() },
      { price: "2453.00", amount: "1.6", total: "3924.80", timestamp: Date.now() },
    ]

    setBuyOrders(mockBuyOrders)
    setSellOrders(mockSellOrders)
  }, [])

  return (
    <div className="space-y-4">
      {/* Sell Orders */}
      <div className="space-y-1">
        <div className="grid grid-cols-3 text-xs text-muted-foreground pb-2 border-b border-border/50">
          <div>Price</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Total</div>
        </div>
        {sellOrders.map((order, index) => (
          <div
            key={index}
            className="grid grid-cols-3 text-sm py-1 hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <div className="text-destructive font-medium">
              {formatNumber(parseFloat(order.price), 2)}
            </div>
            <div className="text-right text-muted-foreground">
              {formatNumber(parseFloat(order.amount), 4)}
            </div>
            <div className="text-right text-muted-foreground">
              {formatNumber(parseFloat(order.total), 2)}
            </div>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="py-3 text-center border-y border-border/50">
        <div className="text-xs text-muted-foreground">Spread</div>
        <div className="text-sm font-semibold">
          {sellOrders.length > 0 && buyOrders.length > 0
            ? formatNumber(parseFloat(sellOrders[0].price) - parseFloat(buyOrders[0].price), 2)
            : "0.00"}
        </div>
      </div>

      {/* Buy Orders */}
      <div className="space-y-1">
        {buyOrders.map((order, index) => (
          <div
            key={index}
            className="grid grid-cols-3 text-sm py-1 hover:bg-success/10 transition-colors cursor-pointer"
          >
            <div className="text-success font-medium">
              {formatNumber(parseFloat(order.price), 2)}
            </div>
            <div className="text-right text-muted-foreground">
              {formatNumber(parseFloat(order.amount), 4)}
            </div>
            <div className="text-right text-muted-foreground">
              {formatNumber(parseFloat(order.total), 2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}