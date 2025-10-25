"use client"

import { Navigation } from "../../components/navigation"
import { Footer } from "../../components/footer"
import { PriceTicker } from "../../components/trade/price-ticker"
import { OrderBook } from "../../components/trade/order-book"
import { OrderForm } from "../../components/trade/order-form"
import { Card } from "../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"

export default function TradePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <PriceTicker />

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 p-6">
              <h2 className="text-xl font-semibold mb-4">Order Book</h2>
              <OrderBook />
            </Card>

            <Card className="lg:col-span-1 p-6">
              <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buy">Buy</TabsTrigger>
                  <TabsTrigger value="sell">Sell</TabsTrigger>
                </TabsList>
                <TabsContent value="buy">
                  <OrderForm type="buy" />
                </TabsContent>
                <TabsContent value="sell">
                  <OrderForm type="sell" />
                </TabsContent>
              </Tabs>
            </Card>

            <Card className="lg:col-span-1 p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                No recent trades
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Orders</h2>
            <div className="text-sm text-muted-foreground">
              Connect wallet to view your orders
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}