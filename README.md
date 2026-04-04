# Useroutr

Non-custodial, cross-chain payment infrastructure where payers can send from any supported chain and merchants receive on their preferred chain/asset, with Stellar as the settlement hub.

## Project Summary

Useroutr is built around **atomic HTLC settlement** across chains:

- **Inbound**: payer locks funds on source chain (EVM/Stellar/Starknet routes).
- **Routing**: Stellar path payment + Soroban contracts handle conversion and fee deduction.
- **Outbound**: funds are bridged/disbursed to merchant destination chain.
- **Guarantee**: either both sides complete or funds are refunded after timeout.

Core backend responsibilities (NestJS modular monolith in `apps/api`):

- Auth + merchants (JWT/API keys)
- Quotes (30s Redis TTL lock)
- Payments lifecycle + webhook events
- Bridge routing (CCTP, Wormhole, Layerswap)
- Relay service (HTLC event watching + secret propagation)
- Invoices, links, payouts, notifications, analytics

Smart contracts:

- Soroban contracts (`contract/soroban`): HTLC, settlement, fee collector, escrow
- EVM HTLC (`contract/evm/contracts/HTLCEvm.sol`)
- Starknet HTLC (`contract/starknet/src/htlc.cairo`)

## Repository Structure (current)

- `apps/api` — NestJS API + Prisma schema/migrations
- `packages/stellar` — shared Stellar clients/helpers
- `packages/types` — shared chain/payment types
- `contract/soroban` — Rust Soroban contracts
- `contract/evm` — Solidity HTLC + Hardhat config
- `contract/starknet` — Cairo HTLC

## How to Run Locally

### 1) Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose

Optional for contract work:

- Rust toolchain (`wasm32-unknown-unknown`)
- `stellar` CLI
- Hardhat-compatible wallet keys/testnet RPCs

### 2) Install dependencies

From repo root:

```bash
npm install
```

If API workspace deps are not installed from root in your environment:

```bash
cd apps/api
npm install
cd ../..
```

### 3) Configure environment

Create `.env` from `.env.example` at repo root:

```bash
cp .env.example .env
```

Important local DB note:

- `docker-compose.yml` maps Postgres to host port **5434** (`5434:5432`)
- so set `DATABASE_URL` to:

```env
DATABASE_URL="postgresql://useroutr:password@localhost:5434/useroutr"
```

Set at least these for local API startup:

- `DATABASE_URL`
- `REDIS_URL=redis://localhost:6379`
- `JWT_SECRET`
- `API_KEY_SALT`

### 4) Start local infrastructure

```bash
docker compose up -d
docker compose ps
```

### 5) Run Prisma migrations

From `apps/api`:

```bash
npx prisma migrate dev
npx prisma generate
```

### 6) Start the API

From `apps/api`:

```bash
npm run start:dev
```

API runs on `http://localhost:3000` by default.

## Useful Commands

From `apps/api`:

```bash
npm run test
npm run test:e2e
npm run build
```

Soroban contracts:

```bash
cd contract/soroban
cargo test
```

EVM contracts:

```bash
cd contract/evm
npm install
npx hardhat test
```

## Notes

- Production deployment requires contract audits, strict key management, and chain-specific bridge credentials.
