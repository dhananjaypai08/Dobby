"use client"

import { useEffect, useState, useCallback } from "react"
import { getLatestPrice, streamPriceUpdates, formatPythPrice } from "./client"
import { PYTH_CONFIG } from "../../lib/contracts/addresses"
import { type PriceData } from "../../types"

/**
 * Hook to fetch and subscribe to a Pyth price feed
 */
export function usePythPrice(feedId: string) {
  const [price, setPrice] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(0)

  const updatePrice = useCallback((data: any) => {
    try {
      if (data.parsed && data.parsed.length > 0) {
        const priceData = data.parsed[0]
        const formattedPrice = formatPythPrice(
          priceData.price.price,
          priceData.price.expo
        )
        const formattedConf = formatPythPrice(
          priceData.price.conf,
          priceData.price.expo
        )
        
        setPrice(formattedPrice)
        setConfidence(formattedConf)
        setLastUpdate(priceData.price.publish_time)
        setLoading(false)
      }
    } catch (err) {
      console.error("Error updating price:", err)
      setError(err as Error)
    }
  }, [])

  useEffect(() => {
    let eventSource: EventSource | null = null

    const initializePrice = async () => {
      try {
        // Fetch initial price
        const initialPrice = await getLatestPrice(feedId)
        updatePrice(initialPrice)

        // Start streaming updates
        eventSource = streamPriceUpdates(
          feedId,
          updatePrice,
          (err) => {
            console.error("Stream error:", err)
            setError(err)
          }
        )
      } catch (err) {
        console.error("Error initializing price:", err)
        setError(err as Error)
        setLoading(false)
      }
    }

    initializePrice()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [feedId, updatePrice])

  return {
    price,
    confidence,
    loading,
    error,
    lastUpdate,
  }
}

/**
 * Hook to fetch ETH/USD price specifically
 */
export function useEthUsdPrice() {
  // Some configurations may not expose an explicit ETH_USD key; fall back to the first configured feed.
  // This avoids a hard type error when the key is absent in the declared type.
  const feeds: Record<string, string> = (PYTH_CONFIG as any).priceFeeds || {}
  const ethFeed = feeds.ETH_USD || Object.values(feeds)[0]
  if (!ethFeed) throw new Error("No price feeds configured in PYTH_CONFIG")
  return usePythPrice(ethFeed)
}

/**
 * Hook to fetch latest price once without streaming
 */
export function usePythPriceOnce(feedId: string) {
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const data = await getLatestPrice(feedId)
        if (data.parsed && data.parsed.length > 0) {
          const priceInfo = data.parsed[0]
          setPriceData({
            price: formatPythPrice(priceInfo.price.price, priceInfo.price.expo),
            confidence: formatPythPrice(priceInfo.price.conf, priceInfo.price.expo),
            expo: priceInfo.price.expo,
            publishTime: priceInfo.price.publish_time,
          })
        }
        setLoading(false)
      } catch (err) {
        console.error("Error fetching price:", err)
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchPrice()
  }, [feedId])

  return { priceData, loading, error }
}

/**
 * Hook for price change tracking
 */
export function usePriceChange(feedId: string, intervalMs: number = 60000) {
  const [priceChange, setPriceChange] = useState<number>(0)
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0)
  const { price } = usePythPrice(feedId)
  const [initialPrice, setInitialPrice] = useState<string | null>(null)

  useEffect(() => {
    if (price && !initialPrice) {
      setInitialPrice(price)
    }
  }, [price, initialPrice])

  useEffect(() => {
    if (!price || !initialPrice) return

    const currentPrice = parseFloat(price)
    const startPrice = parseFloat(initialPrice)
    const change = currentPrice - startPrice
    const changePercent = (change / startPrice) * 100

    setPriceChange(change)
    setPriceChangePercent(changePercent)
  }, [price, initialPrice])

  useEffect(() => {
    const interval = setInterval(() => {
      if (price) {
        setInitialPrice(price)
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }, [price, intervalMs])

  return {
    price,
    priceChange,
    priceChangePercent,
    isPositive: priceChange >= 0,
  }
}