import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { Chain } from "wagmi/chains"

// NOTE: To avoid HTTPS->HTTP mixed content in production, set NEXT_PUBLIC_ARCOLOGY_RPC_URL="/api/rpc"
// and server env ARCOLOGY_UPSTREAM_RPC to the real upstream (e.g. http://65.109.227.117:8545).
// The logic below auto-falls back to the proxy path if it detects an insecure URL while on HTTPS.

/**
 * Custom Arcology Testnet Chain Configuration
 */
const rawRpc = process.env.NEXT_PUBLIC_ARCOLOGY_RPC_URL || "http://65.109.227.117:8545"
// Safe runtime check: if rendering client-side over HTTPS and rpc is insecure, route via proxy.
// (On server, window is undefined, so we cannot detect; rely on env override there.)
// We don't attempt to parse location during SSR to avoid ReferenceError.
// If user sets NEXT_PUBLIC_ARCOLOGY_RPC_URL="/api/rpc" this logic is bypassed.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - window may be undefined at build
const shouldProxy = typeof window !== "undefined" && window.location?.protocol === "https:" && rawRpc.startsWith("http://")
const effectiveRpc = shouldProxy ? "/api/rpc" : rawRpc

export const arcologyTestnet: Chain = {
  id: 118,
  name: "Arcology Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Arcology",
    symbol: "Acol",
  },
  rpcUrls: {
    default: { http: [effectiveRpc] },
    public: { http: [effectiveRpc] },
  },
  blockExplorers: {
    default: { name: "Arcology Explorer", url: "https://explorer.arcology.network" },
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