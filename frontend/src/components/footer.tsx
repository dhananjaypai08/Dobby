"use client"

import Link from "next/link"
import { Button } from "../components/ui/button"
import { Separator } from "../components/ui/separator"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="text-xl font-bold">Dobby</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Professional on-chain trading with parallel execution and real-time oracles.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>
                    <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2">
              {communityLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            © {currentYear} Dobby DEX. Built on Arcology Network.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/terms">
              <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                Terms
              </Button>
            </Link>
            <Link href="/privacy">
              <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground">
                Privacy
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

const productLinks = [
  { label: "Trade", href: "/trade" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Analytics", href: "/analytics" },
]

const resourceLinks = [
  { label: "Documentation", href: "https://docs.pyth.network" },
  { label: "Pyth Network", href: "https://pyth.network" },
  { label: "Arcology Network", href: "https://arcology.network" },
  { label: "GitHub", href: "https://github.com" },
]

const communityLinks = [
  { label: "Discord", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "Telegram", href: "#" },
]