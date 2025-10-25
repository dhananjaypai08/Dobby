"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { usePythPrice } from "../../lib/pyth/hooks"
import { usePlaceOrder } from "../../hooks/useCLOB"
import { TOKENS, CONTRACTS } from "../../lib/contracts/addresses"

interface OrderFormProps {
  tokenPair: "LAMAL" | "ORIGAMI"
}

export function OrderForm({ tokenPair }: OrderFormProps) {
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy")
  const [amount, setAmount] = useState("") // Amount entered in ACOL units
  const [usdNotional, setUsdNotional] = useState("")
  
  const { address, isConnected } = useAccount()
  const { placeOrder, isPlacing, isApproving, step } = usePlaceOrder()
  
  // Get Pyth oracle price for the selected token
  const token = TOKENS[tokenPair]
  const { price: oraclePrice, loading: priceLoading } = usePythPrice(token.pythFeedId)

  // Calculate total when amount changes
  useEffect(() => {
    if (amount && oraclePrice) {
      const totalValue = (parseFloat(amount) * parseFloat(oraclePrice)).toFixed(2)
      setUsdNotional(totalValue)
    } else {
      setUsdNotional("")
    }
  }, [amount, oraclePrice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !address) {
      alert("Please connect your wallet")
      return
    }

    if (!amount || !oraclePrice) {
      alert("Please enter an amount")
      return
    }

    try {
      const result = await placeOrder({
        baseToken: token.address,
        quoteToken: orderType === "buy" ? CONTRACTS.lamal : CONTRACTS.origami,
        isBuy: orderType === "buy",
        price: oraclePrice,
        amount, // ACOL amount
        approveMax: true,
      })

      if (result.success) {
        alert(`Order placed successfully! TX: ${result.txHash}`)
        setAmount("")
        setUsdNotional("")
      } else {
        alert(`Error placing order: ${result.error}`)
      }
    } catch (error) {
      console.error("Error submitting order:", error)
      alert("Failed to place order")
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "buy" | "sell")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy">Buy</TabsTrigger>
          <TabsTrigger value="sell">Sell</TabsTrigger>
        </TabsList>

        <TabsContent value={orderType} className="space-y-4 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Oracle Price Display (Read-only) */}
            <div className="space-y-2">
              <Label>Oracle Price (from Pyth)</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {priceLoading ? (
                  <span className="text-muted-foreground">Loading price...</span>
                ) : oraclePrice ? (
                  <span className="font-mono">${oraclePrice}</span>
                ) : (
                  <span className="text-destructive">Price unavailable</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Price is fetched from Pyth oracle and cannot be edited
              </p>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({token.symbol})</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={priceLoading || !oraclePrice || isPlacing || isApproving}
              />
              <p className="text-xs text-muted-foreground">Enter amount in ACOL. We'll approve (if needed) then place your order.</p>
            </div>

            {/* Total Display */}
            <div className="space-y-2">
              <Label>Notional (USD / ACOL)</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm flex items-center justify-between">
                <span className="font-mono">{usdNotional ? `$${usdNotional}` : "$0.00"}</span>
                {oraclePrice && amount && (
                  <span className="text-xs text-muted-foreground ml-2">{amount} {token.symbol}</span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={!isConnected || isPlacing || isApproving || priceLoading || !oraclePrice || !amount}
            >
              {!isConnected
                ? "Connect Wallet"
                : isApproving
                ? "Approving..."
                : isPlacing
                ? (step === "approving" ? "Awaiting Approval..." : step === "placing" ? "Placing Order..." : "Processing...")
                : `${orderType === "buy" ? "Buy" : "Sell"} ${token.symbol}`}
            </Button>
            {step !== "idle" && step !== "done" && step !== "error" && (
              <p className="text-xs text-muted-foreground text-center">Step: {step}</p>
            )}
            {step === "error" && (
              <p className="text-xs text-destructive text-center">Order failed. Check balance & allowance.</p>
            )}
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}