"use client"

import { useEffect, useState, useCallback } from "react"
import { usePublicClient, useWalletClient, useAccount } from "wagmi"
import { encodeAbiParameters, parseAbiParameters, parseUnits, formatUnits, decodeAbiParameters, encodeFunctionData } from "viem"
import { CONTRACTS, ARCOLOGY_NETWORK } from "../lib/contracts/addresses"
import { CALL_FROM_ADDRESS } from "../lib/config/runtime"
import { CLOB_ABI, ERC20_ABI } from "../lib/contracts/abi"
import type { DecodedOrder, OrderBook, OrderBookEntry, OrderFillEvent } from "../types"
import { TOKENS } from "../lib/contracts/addresses"

/**
 * Hook to fetch all orders from the CLOB contract
 */
export function useOrderBook(refreshInterval: number = 5000) {
  const [orderBook, setOrderBook] = useState<OrderBook>({
    buyOrders: [],
    sellOrders: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const publicClient = usePublicClient()

  const { address: connectedAddress } = useAccount()

  const fetchOrders = useCallback(async () => {
    if (!publicClient) return

    try {
      setLoading(true)

      // Pre-flight: ensure contract bytecode exists at address to avoid opaque "internal error"
      try {
        const code = await publicClient.getBytecode({ address: CONTRACTS.clob })
        if (!code || code === "0x") {
          setError(new Error("CLOB contract not deployed at configured address"))
          setLoading(false)
          return
        }
      } catch (bcErr) {
        console.warn("Bytecode lookup failed", bcErr)
        // proceed – underlying call will still surface an error if truly unreachable
      }

      const buyData = encodeFunctionData({
        abi: CLOB_ABI,
        functionName: "getAllBuyOrders",
      })

      const sellData = encodeFunctionData({
        abi: CLOB_ABI,
        functionName: "getAllSellOrders",
      })

      // Some Arcology node methods require a from/account for non-view (nonpayable) getters, supply zero-address fallback
      const fromAccount: `0x${string}` | undefined = (connectedAddress as `0x${string}` | undefined) || CALL_FROM_ADDRESS
      if (!fromAccount) {
        // Without a valid from address Arcology RPC may reject non-view (nonpayable) getters
        setError(new Error("No call 'from' address available. Connect wallet or set NEXT_PUBLIC_ARCOLOGY_CALL_FROM."))
        setLoading(false)
        return
      }

      const [buyResult, sellResult] = await Promise.all([
        publicClient.call({
          to: CONTRACTS.clob,
          data: buyData,
          account: fromAccount,
        }),
        publicClient.call({
          to: CONTRACTS.clob,
          data: sellData,
          account: fromAccount,
        }),
      ])

      let buyOrdersBytes: `0x${string}`[] = []
      let sellOrdersBytes: `0x${string}`[] = []

      if (buyResult.data) {
        const decoded = decodeAbiParameters(
          [{ type: "bytes[]", name: "orders" }],
          buyResult.data
        )
        buyOrdersBytes = decoded[0] as `0x${string}`[]
      }

      if (sellResult.data) {
        const decoded = decodeAbiParameters(
          [{ type: "bytes[]", name: "orders" }],
          sellResult.data
        )
        sellOrdersBytes = decoded[0] as `0x${string}`[]
      }

      const buyOrders = await decodeOrders(buyOrdersBytes, publicClient)
      const sellOrders = await decodeOrders(sellOrdersBytes, publicClient)

      let aggregatedBuyOrders = aggregateOrdersByPrice(buyOrders, true)
      let aggregatedSellOrders = aggregateOrdersByPrice(sellOrders, false)

      // (Mock fallback removed – rely solely on on-chain orders)

      setOrderBook({
        buyOrders: aggregatedBuyOrders,
        sellOrders: aggregatedSellOrders,
      })
      setError(null)
    } catch (err) {
      // Enhance error surface: unwrap viem style errors if present
      let friendly = "Failed to load order book"
      if (err && typeof err === "object") {
        const anyErr = err as any
        if (anyErr.shortMessage) friendly = anyErr.shortMessage
        else if (anyErr.message) friendly = anyErr.message
        if (anyErr.cause?.message) friendly += `: ${anyErr.cause.message}`
      }
      console.error("Error fetching orders:", err)
      setError(new Error(friendly))
    } finally {
      setLoading(false)
    }
  }, [publicClient, connectedAddress])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchOrders, refreshInterval])

  return { orderBook, loading, error, refetch: fetchOrders }
}

/**
 * Hook to read recent OrderFill events from the contract (no mock fallback).
 * Since the OrderFill event does not include price, UI may show '-' for price.
 */
export function useFilledOrders(refreshInterval: number = 5000) {
  const [filled, setFilled] = useState<OrderFillEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const publicClient = usePublicClient()

  const fetchFills = useCallback(async () => {
    if (!publicClient) return
    try {
      setLoading(true)
      const latest = await publicClient.getBlockNumber()
      const fromBlock = latest > 4000n ? latest - 4000n : 0n
      const logs = await publicClient.getLogs({
        address: CONTRACTS.clob,
        event: {
          type: 'event',
          name: 'OrderFill',
          inputs: [
            { indexed: true, name: 'buyer', type: 'address' },
            { indexed: true, name: 'seller', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
            { indexed: false, name: 'timestamp', type: 'uint256' },
          ],
        } as const,
        fromBlock,
        toBlock: 'latest'
      }) as any[]
      const mapped: OrderFillEvent[] = logs.map(l => {
        const buyer = l.args?.buyer as string
        const seller = l.args?.seller as string
        const amountRaw = l.args?.amount as bigint | undefined
        const tsRaw = l.args?.timestamp as bigint | undefined
        return {
          buyer: buyer || '0x',
          seller: seller || '0x',
            amount: amountRaw ? formatUnits(amountRaw, 18) : '0',
            timestamp: tsRaw ? Number(tsRaw) * 1000 : Date.now(),
            txHash: l.transactionHash as string,
        }
      })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100)
      setFilled(mapped)
      setError(null)
    } catch (err) {
      console.error('Failed to load OrderFill logs', err)
      setError(new Error('Failed to load fills'))
    } finally {
      setLoading(false)
    }
  }, [publicClient])

  useEffect(() => {
    fetchFills()
    const int = setInterval(fetchFills, refreshInterval)
    return () => clearInterval(int)
  }, [fetchFills, refreshInterval])

  return { filled, loading, error, refetch: fetchFills }
}

/**
 * Hook to place an order on the CLOB
 */
export function usePlaceOrder() {
  const [isPlacing, setIsPlacing] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [step, setStep] = useState<"idle" | "checking" | "approving" | "placing" | "done" | "error">("idle")
  const [error, setError] = useState<Error | null>(null)
  const { data: walletClient } = useWalletClient()
  const { address } = useAccount()
  const publicClient = usePublicClient()

  const placeOrder = useCallback(
    async (params: {
      baseToken: `0x${string}`
      quoteToken: `0x${string}`
      isBuy: boolean
      price: string
      amount: string
      approveMax?: boolean
    }) => {
      if (!walletClient || !address || !publicClient) {
        throw new Error("Wallet not connected")
      }

      try {
        setIsPlacing(true)
        setError(null)
        setStep("checking")

        const priceWei = parseUnits(params.price, 18)
        const amountWei = parseUnits(params.amount, 18)

        // Determine which token must be approved (token user spends)
        const spendToken = params.isBuy ? params.quoteToken : params.baseToken
        // Required allowance (rough): if buying we multiply amount * price
        // NOTE: Both have 18 decimals, multiplication inflates by 1e18; contract currently uses price * val without scaling.
        // To avoid under-allowance vs potential over-allowance complexity, request max or raw product.
        const rawRequired = params.isBuy ? amountWei * priceWei : amountWei
        const requiredAllowance = params.approveMax
          ? BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
          : rawRequired

        // Light bytecode probe (warn only – some RPCs may not expose code consistently)
        ;(async () => {
          try {
            const tokenCode = await publicClient.getBytecode({ address: spendToken })
            if (!tokenCode || tokenCode === '0x') {
              console.warn(`WARN: Spend token ${spendToken} has no on-chain code (may not be ERC20)`)
            }
          } catch (probeErr) {
            console.warn('Bytecode probe failed (non-fatal)', probeErr)
          }
        })()

        // Fetch current allowance; on failure assume 0 and continue to approval attempt
        let currentAllowance: bigint = 0n
        try {
          currentAllowance = await publicClient.readContract({
            address: spendToken,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address, CONTRACTS.clob],
          }) as bigint
        } catch (allowErr: any) {
          console.warn("Allowance read failed; proceeding with approval", allowErr)
          currentAllowance = 0n
        }

        if (currentAllowance < rawRequired) {
          setIsApproving(true)
          setStep("approving")
          try {
            // Some ERC20s (USDT style) require first setting allowance to 0 before increasing; attempt direct approve then retry with 0 cycle.
            const attemptApprove = async (value: bigint) => walletClient.writeContract({
              address: spendToken,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [CONTRACTS.clob, value],
              chain: {
                id: ARCOLOGY_NETWORK.chainId,
                name: ARCOLOGY_NETWORK.name,
                nativeCurrency: ARCOLOGY_NETWORK.nativeCurrency,
                rpcUrls: { default: { http: [ARCOLOGY_NETWORK.rpcUrl] }, public: { http: [ARCOLOGY_NETWORK.rpcUrl] } },
              },
            })

            let approveHash: `0x${string}` | null = null
            try {
              approveHash = await attemptApprove(requiredAllowance)
            } catch (firstErr) {
              console.warn('Direct approve failed, trying reset-to-zero pattern', firstErr)
              try {
                const zeroHash = await attemptApprove(0n)
                await publicClient.waitForTransactionReceipt({ hash: zeroHash })
                approveHash = await attemptApprove(requiredAllowance)
              } catch (retryErr) {
                throw retryErr
              }
            }
            if (approveHash) {
              await publicClient.waitForTransactionReceipt({ hash: approveHash })
            }
          } catch (approveErr) {
            console.error("Approval failed", approveErr)
            setError(new Error(`Approval failed for token ${spendToken}: ${(approveErr as any)?.shortMessage || (approveErr as Error).message}`))
            setStep("error")
            setIsApproving(false)
            setIsPlacing(false)
            return { success: false, error: `Approval failed for token ${spendToken}` }
          } finally {
            setIsApproving(false)
          }
        }

        setStep("placing")
        const u256CumulativeData = encodeAbiParameters(
          parseAbiParameters("uint256, uint256"),
          [amountWei, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")]
        )

        const orderData = encodeAbiParameters(
          parseAbiParameters("uint256, address, address, address, bool, uint256, bytes, uint256"),
          [
            BigInt(Date.now()),
            address,
            params.baseToken,
            params.quoteToken,
            params.isBuy,
            priceWei,
            u256CumulativeData,
            BigInt(Math.floor(Date.now() / 1000)),
          ]
        )

        const hash = await walletClient.writeContract({
          address: CONTRACTS.clob,
          abi: CLOB_ABI,
          functionName: "placeOrder",
          args: [orderData],
          chain: {
            id: ARCOLOGY_NETWORK.chainId,
            name: ARCOLOGY_NETWORK.name,
            nativeCurrency: ARCOLOGY_NETWORK.nativeCurrency,
            rpcUrls: {
              default: { http: [ARCOLOGY_NETWORK.rpcUrl] },
              public: { http: [ARCOLOGY_NETWORK.rpcUrl] },
            },
          },
        })
        // (Removed optimistic mock persistence)

        // Still await the on-chain receipt to reflect actual success state
        await publicClient.waitForTransactionReceipt({ hash })

        setStep("done")
        return { success: true, txHash: hash }
      } catch (err) {
        console.error("Error placing order:", err)
        setError(err as Error)
        setStep("error")
        return { success: false, error: (err as Error).message }
      } finally {
        setIsPlacing(false)
      }
    },
    [walletClient, address, publicClient]
  )

  return { placeOrder, isPlacing, isApproving, step, error }
}

/**
 * Hook to fetch user's orders
 */
export function useUserOrders(userAddress?: `0x${string}`) {
  const [orders, setOrders] = useState<DecodedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const publicClient = usePublicClient()
  const { address } = useAccount()

  const targetAddress = userAddress || address

  const fetchUserOrders = useCallback(async () => {
    if (!publicClient || !targetAddress) return

    try {
      setLoading(true)

      const data = encodeFunctionData({
        abi: CLOB_ABI,
        functionName: "getUserOrders",
        args: [targetAddress],
      })

      const fromAccount: `0x${string}` | undefined = (address as `0x${string}` | undefined) || CALL_FROM_ADDRESS
      if (!fromAccount) {
        setError(new Error("No call 'from' address available. Connect wallet or set NEXT_PUBLIC_ARCOLOGY_CALL_FROM."))
        setLoading(false)
        return
      }
      const result = await publicClient.call({
        to: CONTRACTS.clob,
        data,
        account: fromAccount,
      })

      let ordersBytes: `0x${string}`[] = []

      if (result.data) {
        const decoded = decodeAbiParameters(
          [{ type: "bytes[]", name: "orders" }],
          result.data
        )
        ordersBytes = decoded[0] as `0x${string}`[]
      }

      const decodedOrders = await decodeOrders(ordersBytes, publicClient)
      setOrders(decodedOrders)
      setError(null)
    } catch (err) {
      console.error("Error fetching user orders:", err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [publicClient, targetAddress])

  useEffect(() => {
    fetchUserOrders()
  }, [fetchUserOrders])

  return { orders, loading, error, refetch: fetchUserOrders }
}

async function decodeOrders(ordersBytes: `0x${string}`[], publicClient: any): Promise<DecodedOrder[]> {
  const orders: DecodedOrder[] = []

  for (const orderBytes of ordersBytes) {
    try {
      const [id, trader, baseToken, quoteToken, isBuy, price, amountData, timestamp] = decodeAbiParameters(
        parseAbiParameters("uint256, address, address, address, bool, uint256, bytes, uint256"),
        orderBytes
      ) as [
        bigint,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        boolean,
        bigint,
        `0x${string}`,
        bigint
      ]

      let amount = 0n
      try {
        const [amountValue] = decodeAbiParameters(
          parseAbiParameters("uint256, uint256"),
          amountData
        )
        amount = amountValue as bigint
      } catch {
        amount = 0n
      }

      // Map token addresses to known symbols (case-insensitive)
      const addrLower = (a: string) => a.toLowerCase()
      const tokenSymbolFor = (addr: string) => {
        const lower = addrLower(addr)
        for (const key of Object.keys(TOKENS) as (keyof typeof TOKENS)[]) {
          if (addrLower(TOKENS[key].address) === lower) return TOKENS[key].symbol
        }
        return 'UNKNOWN'
      }

      orders.push({
        id: id.toString(),
        trader,
        baseToken,
        quoteToken,
        baseSymbol: tokenSymbolFor(baseToken),
        quoteSymbol: tokenSymbolFor(quoteToken),
        isBuy,
        price: price.toString(),
        amount: amount.toString(),
        timestamp: Number(timestamp),
        displayPrice: formatUnits(price, 18),
        displayAmount: formatUnits(amount, 18),
      } as any)
    } catch (err) {
      console.error("Error decoding order:", err)
    }
  }

  return orders
}

function aggregateOrdersByPrice(orders: DecodedOrder[], isBuy: boolean): OrderBookEntry[] {
  // Track symbol pairing per price level (if multiple, keep first encountered)
  const priceMap = new Map<string, { amount: bigint; count: number; timestamp: number; baseSymbol: string; quoteSymbol: string }>()

  orders.forEach((order) => {
    const price = order.displayPrice
    const amount = BigInt(order.amount)
    const existing = priceMap.get(price)
    if (existing) {
      priceMap.set(price, {
        amount: existing.amount + amount,
        count: existing.count + 1,
        timestamp: Math.max(existing.timestamp, order.timestamp),
        baseSymbol: existing.baseSymbol,
        quoteSymbol: existing.quoteSymbol,
      })
    } else {
      priceMap.set(price, {
        amount,
        count: 1,
        timestamp: order.timestamp,
        baseSymbol: (order as any).baseSymbol || 'BASE',
        quoteSymbol: (order as any).quoteSymbol || 'QUOTE',
      })
    }
  })

  const entries: OrderBookEntry[] = Array.from(priceMap.entries()).map(([price, data]) => ({
    price,
    amount: formatUnits(data.amount, 18),
    total: (parseFloat(price) * parseFloat(formatUnits(data.amount, 18))).toFixed(2),
    timestamp: data.timestamp,
    baseSymbol: data.baseSymbol,
    quoteSymbol: data.quoteSymbol,
  }) as any)

  entries.sort((a, b) => {
    const priceA = parseFloat(a.price)
    const priceB = parseFloat(b.price)
    return isBuy ? priceB - priceA : priceA - priceB
  })

  return entries
}