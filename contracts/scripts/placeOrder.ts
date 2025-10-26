import { ethers } from "ethers";

async function main() {
  const RPC_URL = "http://65.109.227.117:8545";
  const CLOB_ADDRESS = "0x522973dC9c688b05704D1939706b0081Fc4f519A";
  const BASE_TOKEN = "0x1DBac9A4ae262FeAA8308F4053a4D389e1C5FC59";
  const QUOTE_TOKEN = "0x1f62E764640675a8c286d807050A6f09E5Bd0DBa";
  const PRIVATE_KEY = "0x236c7b430c2ea13f19add3920b0bb2795f35a969f8be617faa9629bc5f6201f1";

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Signer:", signer.address);

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)"
  ];

  const CLOB_ABI = [
    "function placeOrder(bytes _data) external",
    "function getAllOrders() external returns (bytes[] memory)"
  ];

  const baseToken = new ethers.Contract(BASE_TOKEN, ERC20_ABI, signer);
  const quoteToken = new ethers.Contract(QUOTE_TOKEN, ERC20_ABI, signer);
  const clob = new ethers.Contract(CLOB_ADDRESS, CLOB_ABI, signer);

  console.log("\n=== Checking Balances ===");
  const baseBal = await baseToken.balanceOf(signer.address);
  const quoteBal = await quoteToken.balanceOf(signer.address);
  console.log(`BASE: ${ethers.formatEther(baseBal)}`);
  console.log(`QUOTE: ${ethers.formatEther(quoteBal)}`);

  console.log("\n=== Approving Tokens ===");
  const approvalAmount = ethers.parseEther("1000000");
  
  const tx1 = await baseToken.approve(CLOB_ADDRESS, approvalAmount);
  console.log(`BASE approval TX: ${tx1.hash}`);
  await tx1.wait();
  console.log("✓ BASE approved");

  const tx2 = await quoteToken.approve(CLOB_ADDRESS, approvalAmount);
  console.log(`QUOTE approval TX: ${tx2.hash}`);
  await tx2.wait();
  console.log("✓ QUOTE approved");

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedOrder = abiCoder.encode(
    ["uint256", "address", "address", "address", "bool", "uint256", "uint256", "uint256"],
    [
      BigInt(Date.now()),
      signer.address,
      BASE_TOKEN,
      QUOTE_TOKEN,
      true,
      ethers.parseEther("1"),
      ethers.parseEther("10"),
      BigInt(Math.floor(Date.now() / 1000))
    ]
  );

  console.log("\n=== Placing Order ===");
  const tx = await clob.placeOrder(encodedOrder, { gasLimit: 800000 });
  console.log(`TX: ${tx.hash}`);
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    console.log(`✓ Success! Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);
    
    console.log("\n=== Reading Orders ===");
    const orders = await clob.getAllOrders();
    console.log(`Total orders: ${orders.length}`);
    
    if (orders.length > 0) {
      const decoded = abiCoder.decode(
        ["uint256", "address", "address", "address", "bool", "uint256", "uint256", "uint256"],
        orders[0]
      );
      console.log("\nFirst Order:");
      console.log(`  ID: ${decoded[0]}`);
      console.log(`  Trader: ${decoded[1]}`);
      console.log(`  IsBuy: ${decoded[4]}`);
      console.log(`  Price: ${ethers.formatEther(decoded[5])}`);
      console.log(`  Amount: ${ethers.formatEther(decoded[6])}`);
    }
  } else {
    console.error("✗ Transaction failed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });