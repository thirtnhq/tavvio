# EVM HTLC Smart Contract

This package contains the Hardhat environment, testing suite, and deployment scripts for the `HTLCEvm` smart contract. The contract operates as a robust Hashed Time-Locked Contract (HTLC) to securely facilitate cross-chain or timed conditional token swaps.

## Prerequisites & Installation

This project is built directly with Hardhat. To install the dependencies, execute:

```bash
cd contract/evm
pnpm install
```

## Environment Setup

The deployment scripts automatically rely on your **root level `.env` file** (e.g. `../../.env`).
Make sure the following variables are defined within your `.env`:

```env
# Essential deployments & connections
PRIVATE_KEY=your_wallet_private_key
INFURA_API_KEY=your_infura_api_key

# Unified API keys for Auto-Verification on explorers (optional)
ETHERSCAN_API_KEY=your_global_etherscan_v2_api_key
BASESCAN_API_KEY=your_basescan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
SNOWTRACE_API_KEY=your_snowtrace_api_key
```

## Available Scripts

### Compile the Contracts
```bash
npx hardhat compile
```

### Run the Test Suite
This will execute the comprehensive, automated suite testing all edge cases of the locking, withdrawing, and refunding mechanisms.
```bash
npx hardhat test
```

### View Gas Reporter
```bash
REPORT_GAS=true npx hardhat test
```

### Deploy the Contract
To deploy the contract to a specific supported network, run the deployment script.

**Supported Networks:** `sepolia`, `baseSepolia`, `bscTestnet`, `polygonAmoy`, `arbitrumSepolia`, `avalancheFujiTestnet`.

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```
_Note: Upon a successful deployment, the script is engineered to automatically inject `HTLC_EVM_ADDRESS_<NETWORK>` into your root `.env` document and actively trigger source code verification on its respective block explorer._

### Verify a Contract (Standalone)
If auto-verification fails or was skipped, you can manually trigger it using:
```bash
npx hardhat verify --network <network_name> <deployed_contract_address>
```
