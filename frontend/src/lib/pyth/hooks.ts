"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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

  // Track last accepted numeric price to detect and correct scaling glitches
  const lastPriceRef = useRef<number | null>(null)

  const updatePrice = useCallback((data: any) => {
    try {
      if (!data?.parsed?.length) return
      // Find the entry that matches our requested feed id; fall back to first if none matches
      const entry = data.parsed.find((p: any) => p.id === feedId || p.price_feed_id === feedId || p.priceFeedId === feedId) || data.parsed[0]
      if (!entry) return
      const priceData = entry
      const expo: number = priceData.price.expo
      const rawPriceNum = Number(priceData.price.price)
      const rawConfNum = Number(priceData.price.conf)

      // Candidate A: standard Pyth scaling price * 10^expo
      let candidateA = rawPriceNum * Math.pow(10, expo)
      // Candidate B: inverse scaling (in case incoming feed already adjusted)
      let candidateB = expo !== 0 ? rawPriceNum / Math.pow(10, expo) : rawPriceNum

      // Heuristic: if exponent negative and raw already "small", treat raw as already scaled
      if (expo < 0 && rawPriceNum < 1e6) {
        candidateA = rawPriceNum
        candidateB = rawPriceNum
      }

      const ratio = (a: number, b: number) => (a > b ? a / b : b / a)

      // Select candidate minimizing jump vs last accepted; fall back to plausibility range
      let chosen = candidateA
      const last = lastPriceRef.current
      if (last !== null) {
        const rA = ratio(candidateA, last)
        const rB = ratio(candidateB, last)
        // If one candidate is wildly off (>50x movement) prefer the other
        if (rA > 50 && rB <= 50) chosen = candidateB
        else if (rB > 50 && rA <= 50) chosen = candidateA
        else if (rA > 50 && rB > 50) {
          // Both implausible – ignore this update
          return
        } else {
          chosen = rA <= rB ? candidateA : candidateB
        }
      } else {
        // First price: prefer candidate that lands in a plausible human range for USD-like tokens
        if (!(candidateA > 0.0001 && candidateA < 1e7) && (candidateB > 0.0001 && candidateB < 1e7)) {
          chosen = candidateB
        }
      }

      // Additional sanity clamp: drop if absurd
      if (!(chosen > 0 && chosen < 1e9)) return

      lastPriceRef.current = chosen

      // Derive scaling factor actually used relative to raw to scale confidence similarly
      const factorUsed = rawPriceNum !== 0 ? chosen / rawPriceNum : 0
      const confDisplay = rawConfNum * factorUsed

      setPrice(chosen.toFixed(2))
      setConfidence(confDisplay > 0 ? confDisplay.toFixed(2) : null)
      setLastUpdate(priceData.price.publish_time)
      setLoading(false)
    } catch (err) {
      console.error("Error updating price:", err)
      setError(err as Error)
    }
  }, [])

  // Reset state when feed id changes so previous feed's price doesn't linger
  useEffect(() => {
    lastPriceRef.current = null
    setPrice(null)
    setConfidence(null)
    setLoading(true)
    setError(null)
    setLastUpdate(0)
  }, [feedId])

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