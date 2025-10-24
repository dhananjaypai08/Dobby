import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { Chain } from "wagmi/chains"

/**
 * Custom Arcology Testnet Chain Configuration
 */
export const arcologyTestnet: Chain = {
  id: 118,
  name: "Arcology Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Arcology",
    symbol: "Acol",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARCOLOGY_RPC_URL || "http://65.109.227.117:8545"],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_ARCOLOGY_RPC_URL || "http://65.109.227.117:8545"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcology Explorer",
      url: "https://explorer.arcology.network",
    },
  },
  testnet: true,
}

/**
 * Wagmi Configuration with RainbowKit
 */
export const wagmiConfig = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Dobby DEX",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [arcologyTestnet],
  ssr: true,
})