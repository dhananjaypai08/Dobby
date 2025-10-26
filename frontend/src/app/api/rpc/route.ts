// JSON-RPC proxy route to avoid mixed-content (HTTPS page -> HTTP RPC) blocking.
// Deploy with a server-side (Node) runtime so we can call insecure upstream over the Vercel network.
// Set ARCOLOGY_UPSTREAM_RPC (server env, no NEXT_PUBLIC) to override the default.
// Client code should point its chain rpcUrls to "/api/rpc" when served over HTTPS.

export const runtime = "nodejs"
export const dynamic = "force-dynamic" // never cache

const DEFAULT_UPSTREAM = "http://65.109.227.117:8545"

async function forward(bodyText: string) {
  const upstream = process.env.ARCOLOGY_UPSTREAM_RPC || DEFAULT_UPSTREAM
  const res = await fetch(upstream, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyText,
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Access-Control-Allow-Origin": "*", // Optional: relax if only first-party usage
    },
  })
}

export async function POST(req: Request) {
  try {
    const bodyText = await req.text()
    // Basic guard: ensure plausible JSON-RPC (prevent abuse)
    if (!bodyText.trim().startsWith("{")) {
      return new Response(JSON.stringify({ error: "Invalid JSON-RPC payload" }), { status: 400 })
    }
    return await forward(bodyText)
  } catch (e: any) {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: e?.message || "Proxy error" } }),
      { status: 502 }
    )
  }
}

export function GET() {
  return new Response(
    JSON.stringify({ status: "ok", upstream: process.env.ARCOLOGY_UPSTREAM_RPC || DEFAULT_UPSTREAM }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
