"use client"

import { useState, useCallback } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { useAccount } from "wagmi"
import { formatNumber } from "../../lib/utils"

interface OrderFormProps {
  type: "buy" | "sell"
}

export function OrderForm({ type }: OrderFormProps) {
  const { isConnected } = useAccount()
  const [price, setPrice] = useState("")
  const [amount, setAmount] = useState("")
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  const total = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : "0.00"

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!price || !amount) {
      alert("Please enter price and amount")
      return
    }

    setIsPlacingOrder(true)
    
    try {
      // TODO: Implement order placement logic
      console.log("Placing order:", { type, price, amount, total })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      alert(`${type === "buy" ? "Buy" : "Sell"} order placed successfully!`)
      
      // Reset form
      setPrice("")
      setAmount("")
    } catch (error) {
      console.error("Error placing order:", error)
      alert("Failed to place order")
    } finally {
      setIsPlacingOrder(false)
    }
  }, [isConnected, price, amount, total, type])

  const isBuy = type === "buy"

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      <div className="space-y-2">
        <Label htmlFor="price">Price</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={isPlacingOrder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.0001"
          placeholder="0.0000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isPlacingOrder}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="total">Total</Label>
        <Input
          id="total"
          type="text"
          value={total}
          readOnly
          disabled
          className="bg-muted"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        variant={isBuy ? "default" : "destructive"}
        disabled={!isConnected || isPlacingOrder || !price || !amount}
      >
        {!isConnected
          ? "Connect Wallet"
          : isPlacingOrder
          ? `Placing ${isBuy ? "Buy" : "Sell"} Order...`
          : `${isBuy ? "Buy" : "Sell"} ${TOKENS.LAMAL.symbol}`}
      </Button>

      {isConnected && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Available:</span>
            <span>0.0000 {isBuy ? TOKENS.ORIGAMI.symbol : TOKENS.LAMAL.symbol}</span>
          </div>
        </div>
      )}
    </form>
  )
}

// Token reference
const TOKENS = {
  LAMAL: { symbol: "LML" },
  ORIGAMI: { symbol: "OG" },
}