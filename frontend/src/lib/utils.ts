import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number to a specific number of decimal places
 */
export function formatNumber(
  value: number | string,
  decimals: number = 2,
  compact: boolean = false
): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  
  if (isNaN(num)) return "0.00"
  
  if (compact) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: decimals,
    }).format(num)
  }
  
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Format a token amount with proper decimals
 */
export function formatTokenAmount(
  amount: bigint | string,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  const value = typeof amount === "string" ? BigInt(amount) : amount
  const divisor = BigInt(10 ** decimals)
  const quotient = value / divisor
  const remainder = value % divisor
  
  const remainderStr = remainder.toString().padStart(decimals, "0")
  const decimalPart = remainderStr.slice(0, displayDecimals)
  
  return `${quotient}.${decimalPart}`
}

/**
 * Parse a token amount string to BigInt
 */
export function parseTokenAmount(
  amount: string,
  decimals: number = 18
): bigint {
  const [whole = "0", decimal = "0"] = amount.split(".")
  const paddedDecimal = decimal.padEnd(decimals, "0").slice(0, decimals)
  return BigInt(whole + paddedDecimal)
}

/**
 * Truncate an Ethereum address
 */
export function truncateAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address) return ""
  if (address.length <= startLength + endLength) return address
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

/**
 * Format a transaction hash
 */
export function formatTxHash(hash: string): string {
  return truncateAddress(hash, 10, 8)
}

/**
 * Format a timestamp to a readable date
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): string {
  if (previous === 0) return "0.00"
  
  const change = ((current - previous) / previous) * 100
  return change.toFixed(2)
}

/**
 * Format a price with currency symbol
 */
export function formatPrice(
  price: number | string,
  currency: string = "USD",
  decimals: number = 2
): string {
  const num = typeof price === "string" ? parseFloat(price) : price
  
  if (isNaN(num)) return "$0.00"
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error("Failed to copy to clipboard:", error)
    return false
  }
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(
  hash: string,
  type: "tx" | "address" | "token" = "tx"
): string {
  const baseUrl = "https://explorer.arcology.network" // Update with actual explorer
  return `${baseUrl}/${type}/${hash}`
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
  return num.toFixed(2)
}