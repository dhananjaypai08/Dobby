"use client"

import { Button } from "../../components/ui/button"
import Link from "next/link"
import { useEthUsdPrice } from "../../lib/pyth/hooks"
import { formatNumber } from "../../lib/utils"

export function Hero() {
  const { price, loading } = useEthUsdPrice()

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center space-y-8">
          {/* Live price indicator */}
          {!loading && price && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-primary/20">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Live ETH/USD:
              </span>
              <span className="text-sm font-semibold text-foreground">
                ${formatNumber(parseFloat(price))}
              </span>
            </div>
          )}

          {/* Main heading */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            Parallelized
            <span className="block text-gradient">
              Fully Onchain CLOB
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Experience institutional-grade order book trading with parallel execution on Arcology Network. 
            Powered by Pyth Oracle for real-time price feeds.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/trade">
                Launch App
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="#features">
                Learn More
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-2">
                <p className="text-3xl md:text-4xl font-bold text-gradient">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const stats = [
  { label: "Parallel Execution", value: "10x" },
  { label: "Gas Efficiency", value: "50%" },
  { label: "Uptime", value: "99.9%" },
  { label: "Oracle Updates", value: "<1s" },
]