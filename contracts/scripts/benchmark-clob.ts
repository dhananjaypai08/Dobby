import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Hardcoded values
const RPC_URL = "http://65.109.227.117:8545";
const CLOB_ADDRESS = "0xe8C7444710Ce7177250f3F4E841065E50eA7E610";
const TOKEN1_ADDRESS = "0x3C34FC443c3Ab84146F19716FDd3fa9959ffB9DB";
const TOKEN2_ADDRESS = "0x5A1580A9894b89c6304f533139e2cCc01dB52425";
const PRIVATE_KEY = "0x236c7b430c2ea13f19add3920b0bb2795f35a969f8be617faa9629bc5f6201f1";
const GAS_PRICE = 1_000_000_000n;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

const CLOB_ABI = [
  "function placeOrder(address tokenIn, address tokenOut, uint256 amountIn, uint256 price, bool isBuy) external returns (uint256)",
  "function cancelOrder(uint256 orderId) external"
];

function ensurePath(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function log(filePath: string, data: string) {
  fs.appendFileSync(filePath, data + "\n");
  console.log(data);
}

async function main() {
  console.log("========================================");
  console.log("CLOB Benchmarking Script");
  console.log("========================================\n");

  // Create provider and signer (ethers v6)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`Signer: ${signer.address}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`CLOB: ${CLOB_ADDRESS}`);
  console.log(`Token1: ${TOKEN1_ADDRESS}`);
  console.log(`Token2: ${TOKEN2_ADDRESS}\n`);

  // Connect to contracts
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
    // Check balances
    log(resultFile, "======== Balances ========");
    const bal1 = await token1.balanceOf(signer.address);
    const bal2 = await token2.balanceOf(signer.address);
    const ethBal = await provider.getBalance(signer.address);
    log(resultFile, `ETH: ${ethers.formatEther(ethBal)}`);
    log(resultFile, `Token1: ${ethers.formatUnits(bal1, 18)}`);
    log(resultFile, `Token2: ${ethers.formatUnits(bal2, 18)}`);
    console.log();

    // Approve Token1
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

    // Approve Token2
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

    // Place BUY order
    log(resultFile, "\n======== Placing BUY Order ========");
    try {
      const buyTx = await clob.placeOrder(
        TOKEN1_ADDRESS,
        TOKEN2_ADDRESS,
        ethers.parseUnits("100", 18),
        ethers.parseUnits("1", 18),
        true,
        { gasPrice: GAS_PRICE, gasLimit: 500000 }
      );
      log(resultFile, `TxHash: ${buyTx.hash}`);
      const buyReceipt = await buyTx.wait();
      totalGas = totalGas + buyReceipt.gasUsed;
      log(resultFile, `✓ Gas: ${buyReceipt.gasUsed}, Block: ${buyReceipt.blockNumber}`);
      successCount++;
    } catch (error: any) {
      log(resultFile, `✗ Error: ${error.message}`);
      errorCount++;
    }
    console.log();

    // Place SELL order
    log(resultFile, "\n======== Placing SELL Order ========");
    try {
      const sellTx = await clob.placeOrder(
        TOKEN2_ADDRESS,
        TOKEN1_ADDRESS,
        ethers.parseUnits("100", 18),
        ethers.parseUnits("1", 18),
        false,
        { gasPrice: GAS_PRICE, gasLimit: 500000 }
      );
      log(resultFile, `TxHash: ${sellTx.hash}`);
      const sellReceipt = await sellTx.wait();
      totalGas = totalGas + sellReceipt.gasUsed;
      log(resultFile, `✓ Gas: ${sellReceipt.gasUsed}, Block: ${sellReceipt.blockNumber}`);
      successCount++;
    } catch (error: any) {
      log(resultFile, `✗ Error: ${error.message}`);
      errorCount++;
    }
    console.log();

    // Cancel order
    log(resultFile, "\n======== Cancelling Order ========");
    try {
      const cancelTx = await clob.cancelOrder(1, {
        gasPrice: GAS_PRICE,
        gasLimit: 200000
      });
      log(resultFile, `TxHash: ${cancelTx.hash}`);
      const cancelReceipt = await cancelTx.wait();
      totalGas = totalGas + cancelReceipt.gasUsed;
      log(resultFile, `✓ Gas: ${cancelReceipt.gasUsed}, Block: ${cancelReceipt.blockNumber}`);
      successCount++;
    } catch (error: any) {
      log(resultFile, `✗ Error: ${error.message}`);
      errorCount++;
    }

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