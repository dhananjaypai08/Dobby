"use client"

import { useEthUsdPrice } from "../../lib/pyth/hooks"
import { formatNumber } from "../../lib/utils"
import { Card } from "../../components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

export function PriceTicker() {
  const { price, loading } = useEthUsdPrice()

  // Mock market stats
  const stats = {
    change24h: "+2.34",
    high24h: "2,465.80",
    low24h: "2,398.20",
    volume24h: "1,234.56",
  }

  const isPositive = stats.change24h.startsWith("+")

  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Main Price */}
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">LML/OG</div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-bold">
              {loading ? (
                <div className="animate-pulse bg-muted h-8 w-32 rounded" />
              ) : (
                `$${price ? formatNumber(parseFloat(price), 2) : "0.00"}`
              )}
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {stats.change24h}%
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-muted-foreground">24h High</div>
            <div className="text-sm font-semibold">${stats.high24h}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">24h Low</div>
            <div className="text-sm font-semibold">${stats.low24h}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">24h Volume</div>
            <div className="text-sm font-semibold">{stats.volume24h} LML</div>
          </div>
        </div>
      </div>
    </Card>
  )
}