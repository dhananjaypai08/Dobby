"use client"

import { useState } from "react"
import { Navigation } from "../../components/navigation"
import { OrderForm } from "../../components/trade/order-form"
import { OrderBookPanel } from "../../components/trade/order-book"
import { FilledOrdersPanel } from "../../components/trade/filled-orders"
import { usePythPrice } from "../../lib/pyth/hooks"
import { TOKENS } from "../../lib/contracts/addresses"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"

export default function TradePage() {
  const [selectedPair, setSelectedPair] = useState<"LAMAL" | "ORIGAMI">("ORIGAMI")
  
  const token = TOKENS[selectedPair]
  const { price, confidence, loading, lastUpdate } = usePythPrice(token.pythFeedId)

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Trade</h1>
          <p className="text-muted-foreground">
            Trade tokens on the Central Limit Order Book with real-time Pyth oracle prices
          </p>
        </div>

        {/* Token Pair Selector */}
        <Tabs value={selectedPair} onValueChange={(v) => setSelectedPair(v as "LAMAL" | "ORIGAMI")} className="mb-6">
          <TabsList>
            <TabsTrigger value="ORIGAMI">ORIGAMI</TabsTrigger>
            <TabsTrigger value="LAMAL">LAMAL</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Price Info Banner */}
        <div className="rounded-lg border bg-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Oracle Price ({token.symbol})
              </h3>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">Loading...</div>
              ) : price ? (
                <div className="flex items-baseline gap-3">
                  <div className="text-3xl font-bold font-mono">${price}</div>
                  {confidence && (
                    <div className="text-sm text-muted-foreground">
                      ±${confidence} confidence
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-2xl font-bold text-destructive">Price Unavailable</div>
              )}
            </div>
            {lastUpdate > 0 && (
              <div className="text-xs text-muted-foreground">
                Updated: {new Date(lastUpdate * 1000).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Trading Interface */}
        <div className="grid xl:grid-cols-4 gap-6">
          {/* Order Book */}
          <div className="xl:col-span-2">
            <OrderBookPanel tokenPair={selectedPair} />
          </div>
          {/* Filled Orders */}
            <FilledOrdersPanel />
          {/* Order Form */}
          <div>
            <OrderForm tokenPair={selectedPair} />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 rounded-lg border bg-muted/50 p-6">
          <h3 className="text-lg font-semibold mb-3">How It Works</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Prices are fetched from Pyth Network oracles in real-time</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Orders are executed on-chain through the CLOB smart contract</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>The order book shows all active buy and sell orders from the blockchain</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Matching happens automatically using Arcology's parallel execution</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}