"use client"

import { Card } from "../../components/ui/card"

export function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">
            Built for <span className="text-gradient">Performance</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A professional CLOB DEX leveraging cutting-edge technology for optimal trading experience
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="p-8 bg-card hover:bg-card/80 transition-smooth hover-lift border-border/50"
            >
              <div className="space-y-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <div className="text-primary text-2xl">
                    {feature.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Metric */}
                {feature.metric && (
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gradient">
                        {feature.metric.value}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {feature.metric.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Technical specs */}
        <div className="mt-24 grid md:grid-cols-3 gap-6">
          {technicalSpecs.map((spec) => (
            <div
              key={spec.label}
              className="p-8 rounded-lg bg-gradient-to-br from-primary/5 to-transparent border border-border/50"
            >
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {spec.label}
                </p>
                <p className="text-3xl font-bold">
                  {spec.value}
                </p>
                <p className="text-sm text-muted-foreground">
                  {spec.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    icon: "⚡",
    title: "Parallel Execution",
    description:
      "Revolutionary concurrent order matching powered by Arcology Network's parallel EVM architecture.",
    metric: {
      value: "10x",
      label: "faster matching",
    },
  },
  {
    icon: "📊",
    title: "Central Limit Order Book",
    description:
      "Professional-grade CLOB with full transparency, price-time priority, and instant settlement.",
    metric: {
      value: "<100ms",
      label: "order placement",
    },
  },
  {
    icon: "🔮",
    title: "Pyth Oracle Integration",
    description:
      "Real-time price feeds with sub-second updates from Pyth Network's decentralized oracle.",
    metric: {
      value: "400ms",
      label: "price update",
    },
  },
  {
    icon: "🔒",
    title: "Non-Custodial",
    description:
      "Your keys, your tokens. All trades execute directly from your wallet with full self-custody.",
  },
  {
    icon: "💎",
    title: "Efficient Gas",
    description:
      "Optimized smart contracts with batched operations reduce gas costs by up to 50% compared to traditional DEXs.",
    metric: {
      value: "50%",
      label: "gas savings",
    },
  },
  {
    icon: "🎯",
    title: "Advanced Orders",
    description:
      "Limit orders, post-only orders, and precise price control for sophisticated trading strategies.",
  },
]

const technicalSpecs = [
  {
    label: "Settlement",
    value: "Instant",
    description: "Orders match and settle in the same transaction",
  },
  {
    label: "Throughput",
    value: "10K+ TPS",
    description: "Handle thousands of orders per second",
  },
  {
    label: "Latency",
    value: "<1s",
    description: "From order submission to blockchain confirmation",
  },
]