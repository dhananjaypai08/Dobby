"use client"

import { useFilledOrders } from "../../hooks/useCLOB"

export function FilledOrdersPanel() {
  // Swallow errors visually; user requested no error banner. Console logging already occurs in hook.
  const { filled, loading, error: _error } = useFilledOrders(4000)

  return (
    <div className="rounded-lg border bg-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filled Orders</h3>
        {loading && <span className="text-xs text-muted-foreground animate-pulse">Updating...</span>}
      </div>
      {/* Error banner intentionally removed per request. Errors remain visible in dev console. */}
      <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground pb-2 border-b">
        <div>Time</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Buyer</div>
        <div className="text-right">Seller</div>
        <div className="text-right">Tx</div>
      </div>
      <div className="mt-2 space-y-1 overflow-y-auto max-h-72 pr-1">
        {filled.length === 0 && !loading && (
          <div className="text-xs text-muted-foreground text-center py-6">No fills yet</div>
        )}
        {filled.map((f, i) => (
          <div key={i} className="grid grid-cols-5 text-[11px] items-center rounded hover:bg-muted/50 p-1">
            <div className="font-mono">{new Date(f.timestamp).toLocaleTimeString()}</div>
            <div className="text-right font-mono">{parseFloat(f.amount).toFixed(4)}</div>
            <div className="text-right truncate font-mono" title={f.buyer}>{f.buyer.slice(0,6)}…{f.buyer.slice(-4)}</div>
            <div className="text-right truncate font-mono" title={f.seller}>{f.seller.slice(0,6)}…{f.seller.slice(-4)}</div>
            <div className="text-right"><a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" href={`https://explorer.arcology.network/tx/${f.txHash}`}>view</a></div>
          </div>
        ))}
      </div>
      
    </div>
  )
}
