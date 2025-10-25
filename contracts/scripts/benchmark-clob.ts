import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
const RPC_URL = "http://65.109.227.117:8545";
const CLOB_ADDRESS = "0x41aE1e9c5eAabaA60882AD3729c1bd0fEeD74325";
const TOKEN1_ADDRESS = "0x005F9d345a264582028bcc5ed5E1CBBEd444e9c8";
const TOKEN2_ADDRESS = "0xD167957474234d33eaa76526ded297626151E1a5";
const PRIVATE_KEY = "0x236c7b430c2ea13f19add3920b0bb2795f35a969f8be617faa9629bc5f6201f1";
const GAS_PRICE = 1_000_000_000n;
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];
const CLOB_ABI = ["function placeOrder(bytes _data) external"]; 

function ensurePath(dirPath: string) { if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath, { recursive: true }); } }
function log(filePath: string, data: string) { fs.appendFileSync(filePath, data + "\n"); console.log(data); }

async function main() {
  console.log("========================================");
  console.log("CLOB Benchmark");
  console.log("========================================\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`Signer: ${signer.address}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`CLOB: ${CLOB_ADDRESS}`);
  console.log(`Token1: ${TOKEN1_ADDRESS}`);
  console.log(`Token2: ${TOKEN2_ADDRESS}\n`);

  const token1 = new ethers.Contract(TOKEN1_ADDRESS, ERC20_ABI, signer);
  const token2 = new ethers.Contract(TOKEN2_ADDRESS, ERC20_ABI, signer);
  const clob = new ethers.Contract(CLOB_ADDRESS, CLOB_ABI, signer);

  const txBase = "benchmark/clob/txs";
  ensurePath(txBase);
  const resultFile = path.join(txBase, "results.txt");
  if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile);

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  let totalGas = 0n;

  try {

    log(resultFile, "======== Balances ========");
    const bal1 = await token1.balanceOf(signer.address);
    const bal2 = await token2.balanceOf(signer.address);
    const ethBal = await provider.getBalance(signer.address);
    log(resultFile, `ETH: ${ethers.formatEther(ethBal)}`);
    log(resultFile, `Token1: ${ethers.formatUnits(bal1, 18)}`);
    log(resultFile, `Token2: ${ethers.formatUnits(bal2, 18)}`);
    console.log();

    log(resultFile, "\n======== Approving Token1 ========");
    try {
      const tx1 = await token1.approve(CLOB_ADDRESS, ethers.parseUnits("1000000", 18), {
        gasPrice: GAS_PRICE,
        gasLimit: 100000
      });
      log(resultFile, `TxHash: ${tx1.hash}`);
      const receipt1 = await tx1.wait();
      totalGas = totalGas + receipt1.gasUsed;
      log(resultFile, `✓ Gas: ${receipt1.gasUsed}, Block: ${receipt1.blockNumber}`);
      successCount++;
    } catch (error: any) {
      log(resultFile, `✗ Error: ${error.message}`);
      errorCount++;
    }
    console.log();

    log(resultFile, "\n======== Approving Token2 ========");
    try {
      const tx2 = await token2.approve(CLOB_ADDRESS, ethers.parseUnits("1000000", 18), {
        gasPrice: GAS_PRICE,
        gasLimit: 100000
      });
      log(resultFile, `TxHash: ${tx2.hash}`);
      const receipt2 = await tx2.wait();
      totalGas = totalGas + receipt2.gasUsed;
      log(resultFile, `✓ Gas: ${receipt2.gasUsed}, Block: ${receipt2.blockNumber}`);
      successCount++;
    } catch (error: any) {
      log(resultFile, `✗ Error: ${error.message}`);
      errorCount++;
    }
    console.log();

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodeOrder = (o:{id:bigint;trader:string;baseToken:string;quoteToken:string;isBuy:boolean;price:bigint;amount:bigint;timestamp:bigint;}) => abiCoder.encode([
      "uint256","address","address","address","bool","uint256","uint256","uint256"
    ], [o.id,o.trader,o.baseToken,o.quoteToken,o.isBuy,o.price,o.amount,o.timestamp]);
    const amount = ethers.parseUnits("20",18);
    const price = ethers.parseUnits("1",18);
    log(resultFile, "\n======== Placing BUY Order ========");
    try {
      const dataBuy = encodeOrder({
        id: BigInt(Date.now()),
        trader: signer.address,
        baseToken: TOKEN1_ADDRESS,
        quoteToken: TOKEN2_ADDRESS,
        isBuy: true,
        price,
        amount,
        timestamp: BigInt(Math.floor(Date.now()/1000))
      });
      const tx = await clob.placeOrder(dataBuy,{gasPrice:GAS_PRICE,gasLimit:600000});
      log(resultFile, `TxHash: ${tx.hash}`);
      const r = await tx.wait();
      totalGas+=r.gasUsed; successCount++; log(resultFile, `✓ Gas: ${r.gasUsed} Block: ${r.blockNumber}`);
    } catch(e:any){ log(resultFile, `✗ Error: ${e.message}`); errorCount++; }
    console.log();
    log(resultFile, "\n======== Placing SELL Order ========");
    try {
      const dataSell = encodeOrder({
        id: BigInt(Date.now())+1n,
        trader: signer.address,
        baseToken: TOKEN1_ADDRESS,
        quoteToken: TOKEN2_ADDRESS,
        isBuy: false,
        price,
        amount,
        timestamp: BigInt(Math.floor(Date.now()/1000))
      });
      const tx = await clob.placeOrder(dataSell,{gasPrice:GAS_PRICE,gasLimit:600000});
      log(resultFile, `TxHash: ${tx.hash}`);
      const r = await tx.wait();
      totalGas+=r.gasUsed; successCount++; log(resultFile, `✓ Gas: ${r.gasUsed} Block: ${r.blockNumber}`);
    } catch(e:any){ log(resultFile, `✗ Error: ${e.message}`); errorCount++; }
    console.log();

  } catch (error: any) {
    log(resultFile, `\nCRITICAL ERROR: ${error.message}`);
    errorCount++;
  }

  const duration = (Date.now() - startTime) / 1000;

  console.log("\n========================================");
  console.log("RESULTS");
  console.log("========================================");
  log(resultFile, "\n========================================");
  log(resultFile, "RESULTS");
  log(resultFile, "========================================");
  log(resultFile, `Duration: ${duration.toFixed(2)}s`);
  log(resultFile, `Success: ${successCount}`);
  log(resultFile, `Errors: ${errorCount}`);
  log(resultFile, `Total Gas: ${totalGas.toString()}`);
  console.log("========================================\n");
  console.log(`Results saved: ${resultFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });