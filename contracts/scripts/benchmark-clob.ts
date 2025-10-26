import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

const RPC_URL = process.env.RPC_URL || "http://65.109.227.117:8545";
const CLOB_ADDRESS = process.env.CLOB_ADDRESS || "0x1A9341E9C1a65F9FF969989aF78563A454e2bb80";
const TOKEN1_ADDRESS = process.env.TOKEN1_ADDRESS || "0x1DBac9A4ae262FeAA8308F4053a4D389e1C5FC59";
const TOKEN2_ADDRESS = process.env.TOKEN2_ADDRESS || "0x1f62E764640675a8c286d807050A6f09E5Bd0DBa";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x236c7b430c2ea13f19add3920b0bb2795f35a969f8be617faa9629bc5f6201f1";

const NUM_BUYS = parseInt(process.env.NUM_BUYS || "5");
const NUM_SELLS = parseInt(process.env.NUM_SELLS || "5");
const BASE_AMOUNT = ethers.parseUnits(process.env.ORDER_AMOUNT || "10", 18);
const BASE_PRICE = ethers.parseUnits(process.env.BASE_PRICE || "1", 18);
const PRICE_TICK_BP = BigInt(process.env.PRICE_TICK_BP || "50");
const INTERLEAVE = process.env.INTERLEAVE !== "false";
const GAS_PRICE = BigInt(process.env.GAS_PRICE || "1000000000");
const MAX_GAS_LIMIT = BigInt(process.env.GAS_LIMIT || "1000000");

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];
const CLOB_ABI = ["function placeOrder(bytes _data) external"];

function ensurePath(dirPath: string) { if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true }); }
function log(lineFile: string, data: string) { fs.appendFileSync(lineFile, data + "\n"); console.log(data); }

interface EncodedOrderParams {
  id: bigint; trader: string; baseToken: string; quoteToken: string;
  isBuy: boolean; price: bigint; amount: bigint; timestamp: bigint;
}

async function approveIfNeeded(token: ethers.Contract, spender: string, label: string, resultFile: string) {
  try {
    const tx = await token.approve(spender, ethers.MaxUint256, { gasPrice: GAS_PRICE, gasLimit: 120000 });
    log(resultFile, `${label} Approve Tx: ${tx.hash}`);
    const r = await tx.wait();
    log(resultFile, `${label} Approve Gas: ${r.gasUsed}`);
    return r.gasUsed as bigint;
  } catch (e: any) {
    log(resultFile, `${label} Approve Error: ${e.message}`);
    return 0n;
  }
}

function computePrice(index: number, isBuy: boolean): bigint {
  const direction = isBuy ? 1n : -1n;
  const tick = BigInt(index);
  const numerator = (10000n + direction * tick * PRICE_TICK_BP);
  if (numerator <= 0) return BASE_PRICE / 2n;
  return (BASE_PRICE * numerator) / 10000n;
}

async function main() {
  console.log("========================================");
  console.log("CLOB Batch Benchmark");
  console.log("========================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`Signer: ${signer.address}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`CLOB: ${CLOB_ADDRESS}`);
  console.log(`BaseToken: ${TOKEN1_ADDRESS}`);
  console.log(`QuoteToken: ${TOKEN2_ADDRESS}`);
  console.log(`Buys: ${NUM_BUYS}  Sells: ${NUM_SELLS}  Interleave: ${INTERLEAVE}`);

  const token1 = new ethers.Contract(TOKEN1_ADDRESS, ERC20_ABI, signer);
  const token2 = new ethers.Contract(TOKEN2_ADDRESS, ERC20_ABI, signer);
  const clob = new ethers.Contract(CLOB_ADDRESS, CLOB_ABI, signer);

  const txDir = "benchmark/clob/txs";
  ensurePath(txDir);
  const resultFile = path.join(txDir, "results.txt");
  if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile);
  log(resultFile, `Benchmark start: ${new Date().toISOString()}`);

  const start = Date.now();
  let success = 0; let failures = 0; let totalGas = 0n; let minGas: bigint | null = null; let maxGas: bigint = 0n;

  const balBase = await token1.balanceOf(signer.address);
  const balQuote = await token2.balanceOf(signer.address);
  const balEth = await provider.getBalance(signer.address);
  log(resultFile, `ETH Balance: ${ethers.formatEther(balEth)}`);
  log(resultFile, `Base Balance: ${ethers.formatUnits(balBase, 18)}`);
  log(resultFile, `Quote Balance: ${ethers.formatUnits(balQuote, 18)}`);


  totalGas += await approveIfNeeded(token1, CLOB_ADDRESS, "BASE", resultFile);
  totalGas += await approveIfNeeded(token2, CLOB_ADDRESS, "QUOTE", resultFile);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodeOrder = (o: EncodedOrderParams) => abiCoder.encode([
    "uint256", "address", "address", "address", "bool", "uint256", "uint256", "uint256"
  ], [o.id, o.trader, o.baseToken, o.quoteToken, o.isBuy, o.price, o.amount, o.timestamp]);

  async function submit(isBuy: boolean, index: number) {
    const id = BigInt(Date.now()) * 1_000_000n + BigInt(index) + (isBuy ? 0n : 500_000n);
    const price = computePrice(index, isBuy);
    const amount = BASE_AMOUNT;
    const payload = encodeOrder({
      id,
      trader: signer.address,
      baseToken: TOKEN1_ADDRESS,
      quoteToken: TOKEN2_ADDRESS,
      isBuy,
      price,
      amount,
      timestamp: BigInt(Math.floor(Date.now() / 1000))
    });
    try {
      log(resultFile, `PENDING,${isBuy ? "BUY" : "SELL"},${index},0,${price.toString()},${amount.toString()},-, -`);
      const tx = await clob.placeOrder(payload, { gasPrice: GAS_PRICE, gasLimit: MAX_GAS_LIMIT });
      log(resultFile, `SENT,${isBuy ? "BUY" : "SELL"},${index},0,${price.toString()},${amount.toString()},${tx.hash},-`);
      const receipt = await tx.wait();
      const g = receipt.gasUsed as bigint;
      success++; totalGas += g; if (minGas === null || g < minGas) minGas = g; if (g > maxGas) maxGas = g;
      log(resultFile, `OK,${isBuy ? "BUY" : "SELL"},${index},${g},${price.toString()},${amount.toString()},${tx.hash},${receipt.blockNumber}`);
    } catch (e: any) {
      failures++; log(resultFile, `ERR,${isBuy ? "BUY" : "SELL"},${index},0,0,0,${(e as any).message?.replace(/,/g,';')}`);
    }
  }

  log(resultFile, "\nTYPE,SIDE,INDEX,GAS,PRICE,AMOUNT,TX_HASH,BLOCK_OR_ERROR");

  if (INTERLEAVE) {
    const maxLoop = Math.max(NUM_BUYS, NUM_SELLS);
    for (let i = 0; i < maxLoop; i++) {
      if (i < NUM_BUYS) await submit(true, i);
      if (i < NUM_SELLS) await submit(false, i);
    }
  } else {
    for (let i = 0; i < NUM_BUYS; i++) await submit(true, i);
    for (let i = 0; i < NUM_SELLS; i++) await submit(false, i);
  }

  const durationSec = (Date.now() - start) / 1000;
  const avgGas = success > 0 ? (totalGas / BigInt(success)) : 0n;
  log(resultFile, "\n======== SUMMARY ========");
  log(resultFile, `DurationSeconds: ${durationSec.toFixed(2)}`);
  log(resultFile, `Success: ${success}`);
  log(resultFile, `Failures: ${failures}`);
  log(resultFile, `TotalGas: ${totalGas.toString()}`);
  log(resultFile, `AvgGas: ${avgGas.toString()}`);
  log(resultFile, `MinGas: ${minGas === null ? 0 : minGas}`);
  log(resultFile, `MaxGas: ${maxGas}`);
  log(resultFile, "========================\n" );

  console.log(`\nCompleted batch: success=${success} failures=${failures} avgGas=${avgGas}`);
  console.log(`Results written to ${resultFile}`);
}

main().catch(e => { console.error(e); process.exit(1); });