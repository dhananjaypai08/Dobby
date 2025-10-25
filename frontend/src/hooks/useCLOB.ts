"use client"

import { useEffect, useState, useCallback } from "react"
import { usePublicClient, useWalletClient, useAccount } from "wagmi"
import { encodeAbiParameters, parseAbiParameters, parseUnits, formatUnits, decodeAbiParameters, encodeFunctionData } from "viem"
import { CONTRACTS, ARCOLOGY_NETWORK } from "../lib/contracts/addresses"
import { CALL_FROM_ADDRESS } from "../lib/config/runtime"
import { CLOB_ABI, ERC20_ABI } from "../lib/contracts/abi"
import type { DecodedOrder, OrderBook, OrderBookEntry } from "../types"

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

      const aggregatedBuyOrders = aggregateOrdersByPrice(buyOrders, true)
      const aggregatedSellOrders = aggregateOrdersByPrice(sellOrders, false)

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

        // Fetch current allowance
        const currentAllowance = await publicClient.readContract({
          address: spendToken,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, CONTRACTS.clob],
        }) as bigint

        if (currentAllowance < rawRequired) {
          setIsApproving(true)
          setStep("approving")
          try {
            const approveHash = await walletClient.writeContract({
              address: spendToken,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [CONTRACTS.clob, requiredAllowance],
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
            await publicClient.waitForTransactionReceipt({ hash: approveHash })
          } catch (approveErr) {
            console.error("Approval failed", approveErr)
            setError(approveErr as Error)
            setStep("error")
            setIsApproving(false)
            setIsPlacing(false)
            return { success: false, error: (approveErr as Error).message }
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

      orders.push({
        id: id.toString(),
        trader,
        baseToken,
        quoteToken,
        isBuy,
        price: price.toString(),
        amount: amount.toString(),
        timestamp: Number(timestamp),
        displayPrice: formatUnits(price, 18),
        displayAmount: formatUnits(amount, 18),
      })
    } catch (err) {
      console.error("Error decoding order:", err)
    }
  }

  return orders
}

function aggregateOrdersByPrice(orders: DecodedOrder[], isBuy: boolean): OrderBookEntry[] {
  const priceMap = new Map<string, { amount: bigint; count: number; timestamp: number }>()

  orders.forEach((order) => {
    const price = order.displayPrice
    const amount = BigInt(order.amount)
    const existing = priceMap.get(price)

    if (existing) {
      priceMap.set(price, {
        amount: existing.amount + amount,
        count: existing.count + 1,
        timestamp: Math.max(existing.timestamp, order.timestamp),
      })
    } else {
      priceMap.set(price, {
        amount,
        count: 1,
        timestamp: order.timestamp,
      })
    }
  })

  const entries = Array.from(priceMap.entries()).map(([price, data]) => ({
    price,
    amount: formatUnits(data.amount, 18),
    total: (parseFloat(price) * parseFloat(formatUnits(data.amount, 18))).toFixed(2),
    timestamp: data.timestamp,
  }))

  entries.sort((a, b) => {
    const priceA = parseFloat(a.price)
    const priceB = parseFloat(b.price)
    return isBuy ? priceB - priceA : priceA - priceB
  })

  return entries
}