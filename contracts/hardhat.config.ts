import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-viem";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
    profiles: {
      default: {
        version: "0.8.19",
      },
      production: {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    arcologyTestnet: {
      type: "http",
      chainType: "l1",
      url: "http://65.109.227.117:8545",
      accounts: [configVariable("PRIVATE_KEY")],
      gasPrice: 1_000_000_000,
      gasMultiplier: 1.2,
    },
  },
};

export default config;
