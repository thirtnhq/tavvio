import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });
dotenv.config();

const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        sepolia: {
            url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
            accounts: [PRIVATE_KEY],
        },
        "baseSepolia": {
            url: "https://sepolia.base.org",
            accounts: [PRIVATE_KEY],
        },
        "bscTestnet": {
            url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
            accounts: [PRIVATE_KEY],
        },
        "polygonAmoy": {
            url: `https://polygon-amoy.infura.io/v3/${INFURA_API_KEY}`,
            accounts: [PRIVATE_KEY],
        },
        "arbitrumSepolia": {
            url: `https://arbitrum-sepolia.infura.io/v3/${INFURA_API_KEY}`,
            accounts: [PRIVATE_KEY],
        },
        "avalancheFujiTestnet": {
            url: "https://api.avax-test.network/ext/bc/C/rpc",
            accounts: [PRIVATE_KEY],
        },
    },
    etherscan: {
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY || "",
            baseSepolia: process.env.BASESCAN_API_KEY || "",
            bscTestnet: process.env.BSCSCAN_API_KEY || "",
            polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
            arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
            avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "",
        },
    },
    sourcify: {
        enabled: false
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
    },
};

export default config;
