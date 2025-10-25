"use client"

import { Button } from "../../components/ui/button"
import Link from "next/link"

export function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative p-12 rounded-2xl glass-effect border border-primary/20 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-600/10" />
          
          {/* Content */}
          <div className="relative text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Start <span className="text-gradient">Trading</span>?
            </h2>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the future of decentralized trading with parallel execution, 
              real-time oracles, and institutional-grade order matching.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button asChild size="lg">
                <Link href="/trade">
                  Launch App
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/portfolio">
                  View Portfolio
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 