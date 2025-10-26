import { NextRequest } from "next/server"
import { promises as fs } from "fs"
import path from "path"

// Disable caching for this route
export const revalidate = 0

interface MockOrderEntry {
  price: string
  amount: string
  timestamp: number
  side: 'buy' | 'sell'
}

interface FilledOrderEntry {
  price: string
  amount: string
  timestamp: number
  takerSide: 'buy' | 'sell' // side of the incoming order that triggered the match
  makerSide: 'buy' | 'sell'
}

interface MockOrderBookFile {
  buyOrders: MockOrderEntry[]
  sellOrders: MockOrderEntry[]
  filledOrders: FilledOrderEntry[]
}

const DATA_FILE = path.join(process.cwd(), "data", "mock-orders.json")

async function ensureFile(): Promise<MockOrderBookFile> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8")
    const parsed = JSON.parse(raw)
    if (!parsed.buyOrders) parsed.buyOrders = []
    if (!parsed.sellOrders) parsed.sellOrders = []
    if (!parsed.filledOrders) parsed.filledOrders = []
    return parsed as MockOrderBookFile
  } catch (err) {
    const initial: MockOrderBookFile = { buyOrders: [], sellOrders: [], filledOrders: [] }
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2))
    return initial
  }
}

async function persist(data: MockOrderBookFile) {
  const tmp = DATA_FILE + ".tmp"
  await fs.writeFile(tmp, JSON.stringify(data, null, 2))
  await fs.rename(tmp, DATA_FILE)
}

export async function GET() {
  try {
    const data = await ensureFile()
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to read mock orders', details: err?.message }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
  const { side, price, amount } = body as { side?: string; price?: string; amount?: string }

    if (side !== 'buy' && side !== 'sell') {
      return new Response(JSON.stringify({ error: "Invalid side" }), { status: 400 })
    }
    if (!price || !amount) {
      return new Response(JSON.stringify({ error: "Missing price or amount" }), { status: 400 })
    }

    const data = await ensureFile()
    const now = Date.now()
    const incoming: MockOrderEntry = { side, price: String(price), amount: String(amount), timestamp: now }

    // Matching logic: look for opposite side order(s) with identical price.
    // Simple strategy: FIFO single match; if found, record filled trade and remove matched maker order.
    const oppositeSideArray = side === 'buy' ? data.sellOrders : data.buyOrders
    const idx = oppositeSideArray.findIndex(o => o.price === incoming.price)
    if (idx !== -1) {
      const maker = oppositeSideArray[idx]
      oppositeSideArray.splice(idx, 1)
      data.filledOrders.push({
        price: incoming.price,
        // For simplicity assume entire amount matched; choose min for safety.
        amount: String(Math.min(parseFloat(maker.amount), parseFloat(incoming.amount))),
        timestamp: now,
        takerSide: side,
        makerSide: maker.side,
      })
      await persist(data)
      return new Response(JSON.stringify({ success: true, filled: true }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }

    // No match -> add to book
    if (side === 'buy') data.buyOrders.push(incoming)
    else data.sellOrders.push(incoming)

    await persist(data)

    return new Response(JSON.stringify({ success: true, entry: incoming, filled: false }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to save mock order', details: err?.message }), { status: 500 })
  }
}
