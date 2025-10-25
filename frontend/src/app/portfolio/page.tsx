"use client"

import { Navigation } from "../../components/navigation"
import { Footer } from "../../components/footer"
import { Card } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { useAccount, useBalance } from "wagmi"
import { CONTRACTS, TOKENS } from "../../lib/contracts/addresses"
import { formatTokenAmount } from "../../lib/utils"

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  
  const lamalBalance = useBalance({
    address: address,
    token: CONTRACTS.lamal,
  })
  
  const origamiBalance = useBalance({
    address: address,
    token: CONTRACTS.origami,
  })

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        
        <main className="flex-1 flex items-center justify-center px-6">
          <Card className="p-12 text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your portfolio and trading history
            </p>
          </Card>
        </main>

        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Portfolio</h1>
            <div className="text-sm text-muted-foreground">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Token Balances</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <div className="font-semibold">{TOKENS.LAMAL.symbol}</div>
                  <div className="text-sm text-muted-foreground">{TOKENS.LAMAL.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {lamalBalance.data ? formatTokenAmount(lamalBalance.data.value, 18, 4) : '0.0000'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {TOKENS.LAMAL.symbol}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <div className="font-semibold">{TOKENS.ORIGAMI.symbol}</div>
                  <div className="text-sm text-muted-foreground">{TOKENS.ORIGAMI.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {origamiBalance.data ? formatTokenAmount(origamiBalance.data.value, 18, 4) : '0.0000'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {TOKENS.ORIGAMI.symbol}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Open Orders</h2>
            <div className="text-sm text-muted-foreground text-center py-8">
              No open orders
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Order History</h2>
            <div className="text-sm text-muted-foreground text-center py-8">
              No order history
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}