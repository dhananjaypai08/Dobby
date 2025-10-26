import { HermesClient } from "@pythnetwork/hermes-client"
import { PYTH_CONFIG } from "../../lib/contracts/addresses"

/**
 * Initialize Pyth Hermes client
 */
export const pythClient = new HermesClient(PYTH_CONFIG.hermesUrl, {})

/**
 * Get latest price for a feed ID
 */
export async function getLatestPrice(feedId: string) {
  try {
    const priceUpdates = await pythClient.getLatestPriceUpdates([feedId])
    return priceUpdates
  } catch (error) {
    console.error("Error fetching price from Pyth:", error)
    throw error
  }
}

/**
 * Stream price updates for a feed ID
 */
export function streamPriceUpdates(
  feedId: string,
  onMessage: (data: any) => void,
  onError: (error: Error) => void
) {
  try {
    // Preferred: SDK method (newer versions expose getStreamingPriceUpdates)
    // Fallback: manual SSE construction if method is absent.
    const anyClient = pythClient as unknown as {
      getStreamingPriceUpdates?: (ids: string[]) => EventSource
    }

    let eventSource: EventSource

    if (typeof anyClient.getStreamingPriceUpdates === "function") {
      eventSource = anyClient.getStreamingPriceUpdates([feedId])
    } else {
      // Manual SSE fallback
      const url = new URL("/v2/updates/price/stream", PYTH_CONFIG.hermesUrl)
      url.searchParams.append("ids[]", feedId)
      eventSource = new EventSource(url.toString())
      // We receive raw JSON lines similar to SDK
    }

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (err) {
        console.error("Error parsing price update:", err)
      }
    }

    eventSource.onerror = (err: Event) => {
      console.error("Error in price stream:", err)
      onError(err as unknown as Error)
    }

    return eventSource
  } catch (error) {
    console.error("Error starting price stream:", error)
    throw error
  }
}

/**
 * Format Pyth price with proper exponential adjustment
 */
export function formatPythPrice(price: string, expo: number): string {
  const priceNum = parseFloat(price)
  const adjustedPrice = priceNum * Math.pow(10, expo)
  return adjustedPrice.toFixed(2)
}

/**
 * Get multiple price feeds
 */
export async function getMultiplePrices(feedIds: string[]) {
  try {
    const priceUpdates = await pythClient.getLatestPriceUpdates(feedIds)
    return priceUpdates
  } catch (error) {
    console.error("Error fetching multiple prices:", error)
    throw error
  }
}