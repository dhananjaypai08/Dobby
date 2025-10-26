# Dobby: Fully On-Chain Parallel Execution CLOB

## Overview
Dobby is a fully on-chain central limit order book (CLOB) designed natively for Arcology's parallel execution environment. Instead of serial transaction processing, Dobby decomposes order lifecycle operations into concurrency-safe segments that Arcology's deterministic scheduler can execute in parallel. This unlocks higher throughput, lower tail latency for matching, and improved capital efficiency without resorting to off-chain match engines or sequencer trust assumptions.

The system leverages `@arcologynetwork/concurrentlib` to express conflict domains (price levels, user balance segments, order slots) so that independent state partitions are executed concurrently while preserving deterministic final state consensus.

## Key Differentiators
- Pure Solidity order book logic (no off-chain coordinator)
- Deterministic parallelization primitives via Arcology concurrentlib
- Price-level sharding and account delta isolation reduce write contention
- Benchmarkable in-script (Hardhat) against devnet with reproducible scenarios

## Parallelization Model
Arcology's execution engine analyzes transactional read/write sets. Dobby aligns with this by structuring storage such that:

1. Price levels are siloed in discrete storage buckets (e.g. mapping keyed by price → queue/head pointers)
2. User balances and reserved collateral are maintained in partitions to minimize cross-price interference
3. Order IDs embed lightweight locality hints improving speculative scheduling
4. Matching loops emit balance deltas staged per user, then a commit phase applies netted adjustments atomically
5. Cancellations and partial fills only touch the narrow slice of state corresponding to the affected level and user delta entries


## Deployed (Arcology Dev Chain 118)
These addresses come from `contracts/ignition/deployments/chain-118/deployed_addresses.json`.

| Module Artifact | Address |
|-----------------|-------------------------------------------|
| TokenModule#TokenId1_v001 | 0x1DBac9A4ae262FeAA8308F4053a4D389e1C5FC59 |
| TokenModule#TokenId2_v001 | 0x1f62E764640675a8c286d807050A6f09E5Bd0DBa |
| CLOBModule#CLOB | 0x522973dC9c688b05704D1939706b0081Fc4f519A |

> Note: Addresses are environment / deployment specific. Always confirm against the intended chain ID before interacting.

## Arcology Devnet RPC
```
http://65.109.227.117:8545
```

## Repository Layout
```
contracts/
	CLOB.sol              # Core order book + matching engine
	Token.sol             # Reference ERC20-style test token(s)
	interfaces/ICLOB.sol  # External interface surface
	types/CLOB.sol        # Structs / enums / domain types
	constants/Address.sol # Shared constant addresses / system refs
	ignition/modules/     # Deployment definitions (Ignition)
	scripts/benchmark-clob.ts  # Benchmark harness
test/                   # Solidity tests (Foundry style integrated via Hardhat)
frontend/               # Next.js UI (portfolio + trade flows)
```

## Development Prerequisites
- Node.js 20+ (24 used in CI)
- Hardhat ^3.x (installed locally inside `contracts` and for test, lints, benchmarks and network interaction scripts)

Install dependencies:
```
npm install
npm --prefix contracts install
```

## Compile
```
npm --prefix contracts run compile
```

## Testing
Root convenience script proxies into `contracts`:
```
npm test
```
Direct invocation:
```
cd contracts && npx hardhat test solidity
```
Add `--grep <pattern>` to scope specific suites when iterating.

## Benchmarking
Bench harness simulates batched order flow & fills against the devnet or a local node:
```
npm run benchmark
```
Script: `contracts/scripts/benchmark-clob.ts`

Environment variables you may supply (else it uses the default stuff):
```
PRIVATE_KEY=0x236c7b430c2ea13f19add3920b0bb2795f35a969f8be617faa9629bc5f6201f1
ARC_RPC_URL=http://65.109.227.117:8545
ORDERS_PER_BATCH=500
BATCHES=10
```
If unset, the script falls back to defaults or Hardhat network config. Adjust to stress different contention profiles (e.g. widen price dispersion to increase parallel lanes).

## Contract Architecture (High Level)
Core components:
1. CLOB.sol: Maintains mappings: price → order queue (FIFO or price-time priority) and user → balance / reserved state.
2. Types layer: Centralizes `Order`, `MatchResult`, `BalanceDelta` for deterministic encoding and potential off-chain indexing.
3. Interface (ICLOB.sol): Provides external entrypoints (place, cancel, batchMatch) isolating consumers from internal mutation patterns.
4. Constants: Houses immutable system addresses (treasury, fee sink, etc.) so matching logic stays pure.
5. Token(s): Simple ERC20 derivatives for quoting / base assets in tests & benchmarks.
6. Ignition Deployment Modules: Declarative deployment graph for reproducible provisioning.

### Matching Flow
1. User submits order (limit / market-like). Order struct hashed → ID.
2. System inserts into price bucket; if crossing conditions satisfied, triggers matching routine.
3. Matching routine iterates best opposing levels producing `BalanceDelta` entries.
4. Concurrentlib-backed accumulation aggregates net deltas per account while isolating price level state.
5. Commit phase applies deltas (write-minimized) and emits events for indexers.

### Concurrency Safety Considerations
- Writes are minimized to touched price levels and user balance partitions.
- No shared mutable iterative cursor across independent price slices; each slice maintains its own pointer.
- Reentrancy gates protect multi-phase match/commit sequence.

## Linting & Formatting
Solidity lint (requires `solhint` devDependency if added):
```
npm run lint
```
Format check:
```
npm --prefix contracts run format:check
```

## Deployment (Ignition)
Example (Token):
```
npm --prefix contracts run deploy:token
```
Example (CLOB):
```
npm --prefix contracts run deploy:clob
```
Ensure your Hardhat network config includes the Arcology devnet with correct RPC + accounts.

## Environment Variables Summary
```
PRIVATE_KEY          # Deployer / benchmark signer
ARC_RPC_URL          # Arcology devnet endpoint
ORDERS_PER_BATCH     # Benchmark sizing
BATCHES              # Number of benchmark iterations
```