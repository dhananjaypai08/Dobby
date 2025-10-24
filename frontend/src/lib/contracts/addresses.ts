import { type ContractAddresses } from "../../types"

/**
 * Contract addresses on Arcology Network (Chain ID: 118)
 */
export const CONTRACTS: ContractAddresses = {
  clob: "0xe8C7444710Ce7177250f3F4E841065E50eA7E610",
  lamal: "0x5A1580A9894b89c6304f533139e2cCc01dB52425",
  origami: "0x3C34FC443c3Ab84146F19716FDd3fa9959ffB9DB",
} as const

/**
 * Token configurations
 */
export const TOKENS = {
  LAMAL: {
    address: CONTRACTS.lamal,
    symbol: "LML",
    name: "Lamal",
    decimals: 18,
  },
  ORIGAMI: {
    address: CONTRACTS.origami,
    symbol: "OG",
    name: "Origami",
    decimals: 18,
  },
} as const

/**
 * Pyth Oracle configuration
 */
export const PYTH_CONFIG = {
  hermesUrl: process.env.NEXT_PUBLIC_PYTH_HERMES_URL || "https://hermes.pyth.network",
  priceFeeds: {
    ETH_USD: "0xc96458d393fe9deb7a7d63a0ac41e2898a67a7750dbd166673279e06c868df0a",
  },
} as const

/**
 * Network configuration
 */
export const ARCOLOGY_NETWORK = {
  chainId: 118,
  name: "Arcology Testnet",
  rpcUrl: process.env.NEXT_PUBLIC_ARCOLOGY_RPC_URL || "http://65.109.227.117:8545",
  blockExplorer: "https://explorer.arcology.network",
  nativeCurrency: {
    name: "Arcology",
    symbol: "ARC",
    decimals: 18,
  },
} as const

/**
 * Application configuration
 */
export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Dobby DEX",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  description: "Professional Central Limit Order Book DEX on Arcology Network",
  defaultSlippage: 0.5, // 0.5%
  maxSlippage: 5.0, // 5%
  orderBookDepth: 20, // Number of orders to display
  priceUpdateInterval: 1000, // 1 second
} as const