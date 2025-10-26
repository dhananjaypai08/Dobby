/**
 * Order structure matching the smart contract
 */
export interface Order {
  id: bigint
  trader: `0x${string}`
  baseToken: `0x${string}`
  quoteToken: `0x${string}`
  isBuy: boolean
  price: bigint
  amount: `0x${string}` // U256Cumulative contract address
  timestamp: bigint
}

/**
 * Decoded order with readable values
 */
export interface DecodedOrder {
  id: string
  trader: string
  baseToken: string
  quoteToken: string
  baseSymbol?: string
  quoteSymbol?: string
  isBuy: boolean
  price: string
  amount: string
  timestamp: number
  displayPrice: string
  displayAmount: string
}

/**
 * Order book entry
 */
export interface OrderBookEntry {
  price: string
  amount: string
  total: string
  timestamp: number
  baseSymbol?: string
  quoteSymbol?: string
}

/**
 * Aggregated order book
 */
export interface OrderBook {
  buyOrders: OrderBookEntry[]
  sellOrders: OrderBookEntry[]
}

/**
 * Trade history entry
 */
export interface Trade {
  buyer: string
  seller: string
  price: string
  amount: string
  timestamp: number
  txHash: string
}

// On-chain OrderFill event (contract does NOT emit price; UI may show '-')
export interface OrderFillEvent {
  buyer: string
  seller: string
  amount: string
  timestamp: number // ms epoch
  txHash: string
}

/**
 * Token information
 */
export interface Token {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  logo?: string
}

/**
 * Price feed data from Pyth
 */
export interface PriceData {
  price: string
  confidence: string
  expo: number
  publishTime: number
}

/**
 * Pyth price update
 */
export interface PythPriceUpdate {
  id: string
  price: {
    price: string
    conf: string
    expo: number
    publish_time: number
  }
  ema_price: {
    price: string
    conf: string
    expo: number
    publish_time: number
  }
  metadata?: {
    slot: number
    proof_available_time: number
    prev_publish_time: number
  }
}

/**
 * User balance
 */
export interface UserBalance {
  token: Token
  balance: bigint
  formattedBalance: string
  usdValue?: string
}

/**
 * Transaction status
 */
export type TransactionStatus = "idle" | "pending" | "success" | "error"

/**
 * Transaction state
 */
export interface TransactionState {
  status: TransactionStatus
  hash?: string
  error?: string
}

/**
 * Order form data
 */
export interface OrderFormData {
  type: "buy" | "sell"
  price: string
  amount: string
  total: string
}

/**
 * Market statistics
 */
export interface MarketStats {
  lastPrice: string
  priceChange24h: string
  high24h: string
  low24h: string
  volume24h: string
  timestamp: number
}

/**
 * User position
 */
export interface Position {
  token: Token
  amount: string
  averagePrice: string
  currentPrice: string
  pnl: string
  pnlPercentage: string
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  chainId: number
  name: string
  rpcUrl: string
  blockExplorer?: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

/**
 * Contract addresses
 */
export interface ContractAddresses {
  clob: `0x${string}`
  lamal: `0x${string}`
  origami: `0x${string}`
}

/**
 * Approval state
 */
export interface ApprovalState {
  isApproved: boolean
  isApproving: boolean
  needsApproval: boolean
}

/**
 * Order placement result
 */
export interface OrderPlacementResult {
  success: boolean
  txHash?: string
  orderId?: string
  error?: string
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  timestamp: number
  price: number
  volume?: number
}

/**
 * Error with code
 */
export interface ErrorWithCode extends Error {
  code?: string | number
  data?: any
}