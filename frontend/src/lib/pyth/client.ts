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
    const eventSource = (pythClient as any).getStreamingPriceUpdates([feedId])
    
    eventSource.onmessage = (event: any) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error("Error parsing price update:", error)
      }
    }
    
    eventSource.onerror = (error: any) => {
      console.error("Error in price stream:", error)
      onError(error as Error)
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