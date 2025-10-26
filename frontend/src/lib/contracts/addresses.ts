import { type ContractAddresses } from "../../types"

/**
 * Contract addresses on Arcology Network (Chain ID: 118)
 */
export const CONTRACTS: ContractAddresses = {
  clob: "0x522973dC9c688b05704D1939706b0081Fc4f519A",
  lamal: "0x1f62E764640675a8c286d807050A6f09E5Bd0DBa",
  origami: "0x1DBac9A4ae262FeAA8308F4053a4D389e1C5FC59",
} as const

/**
 * Token configurations
 */
export const TOKENS = {
  LAMAL: {
    address: CONTRACTS.lamal,
    symbol: "LAMAL",
    name: "Lamal",
    decimals: 18,
    // Using Pyth price feed as reference for LAMAL
    pythFeedId: "0xc96458d393fe9deb7a7d63a0ac41e2898a67a7750dbd166673279e06c868df0a",
  },
  ORIGAMI: {
    address: CONTRACTS.origami,
    symbol: "ORIGAMI",
    name: "Origami",
    decimals: 18,
    // Using ETH/USD price feed as reference for ORIGAMI
    pythFeedId: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  },
} as const

/**
 * Pyth Oracle configuration
 */
export const PYTH_CONFIG = {
  hermesUrl: "https://hermes.pyth.network",
  priceFeeds: {
    // ETH/USD for ORIGAMI
    ORIGAMI: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    // Price feed for LAMAL  
    LAMAL: "0xc96458d393fe9deb7a7d63a0ac41e2898a67a7750dbd166673279e06c868df0a",
  },
} as const

/**
 * Network configuration
 */
export const ARCOLOGY_NETWORK = {
  chainId: 118,
  name: "Arcology Testnet",
  rpcUrl: "http://65.109.227.117:8545",
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
  name: "Dobby DEX",
  description: "Professional Central Limit Order Book DEX on Arcology Network",
  defaultSlippage: 0.5, // 0.5%
  maxSlippage: 5.0, // 5%
  orderBookDepth: 20, // Number of orders to display
  priceUpdateInterval: 1000, // 1 second
} as const