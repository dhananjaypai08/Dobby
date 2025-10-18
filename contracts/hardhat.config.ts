import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
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
    // arcologyTestnet: {
    //   type: "http",
    //   chainType: "l1",
    //   url: "https://sepolia.infura.io/v3/2WCbZ8YpmuPxUtM6PzbFOfY5k4B",
    //   accounts: [configVariable("PRIVATE_KEY")]
    // },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: "https://sepolia.infura.io/v3/2WCbZ8YpmuPxUtM6PzbFOfY5k4B",
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
};

export default config;
