

| USEROUTR Technical Architecture & Build Guide  Non-Custodial Cross-Chain Payment Infrastructure Stellar · Soroban · NestJS · Next.js · Rust · HTLC Version 1.0  ·  2026  ·  Confidential |
| ----- |

| Who this document is for This document is the single source of truth for building Useroutr from scratch. It covers system architecture, every technology decision and why it was made, complete smart contract code, NestJS service structure, database schema, bridge integrations, and a week-by-week build sequence. Read it entirely before writing a single line of code. |
| :---- |

**01  ·  SYSTEM OVERVIEW**

# **What Useroutr Is Building**

Useroutr is a non-custodial, cross-chain payment infrastructure platform. Any payer on any chain sends funds using any wallet. Any merchant on any chain receives funds in any asset. Stellar is the invisible settlement hub in the middle.

The key word is non-custodial. Useroutr never holds user funds. Every payment flows through audited smart contracts — Hash Time Locked Contracts (HTLCs) on Stellar (Soroban) and on each supported EVM chain. Either both sides of the swap complete atomically, or both sides refund. There is no state where a payer has lost funds and a merchant was not paid.

## **The Three-Layer Model**

| Layer | Responsibility |
| :---- | :---- |
| Inbound Layer | Detect payer chain. Accept funds from any wallet (EVM, Solana, Stellar, fiat via MoneyGram). Lock into HTLC on source chain. |
| Routing Layer | Stellar hub. Path payments convert assets. Soroban Settlement Contract deducts fee, locks output for merchant. |
| Outbound Layer | Bridge funds from Stellar to merchant's destination chain. Release from HTLC when secret is revealed. Merchant receives funds. |

## **The HTLC Guarantee**

Every cross-chain payment uses a Hash Time Locked Contract. The mechanism guarantees atomic settlement:

* **Secret S**

* Payer locks funds on source chain with hashlock H and a 24-hour timeout.

* Useroutr's Soroban contract locks merchant funds on Stellar with the same hashlock H and a 12-hour timeout.

* Merchant (or Useroutr relay) reveals S on Stellar → merchant receives funds.

* S is now public on-chain. Relay uses S on source chain → Useroutr liquidity pool reimbursed.

* If either side fails: timelock expires → automatic refund. No funds are lost.

| Why Stellar as the hub? Stellar has native path payments — the network finds the best multi-hop conversion route across its built-in DEX automatically. Transaction finality is 5 seconds. Fees are fractions of a cent. The anchor network provides regulated fiat on/off ramps in 174 countries. Soroban is a mature smart contract platform. No other blockchain offers all four of these simultaneously. |
| :---- |

**02  ·  TECHNOLOGY STACK**

# **Full Technology Stack**

Every technology decision below was made for a specific reason. The stack is optimized for a solo developer building production payment infrastructure.

## **Frontend**

| Technology | Role & Reasoning |
| :---- | :---- |
| Next.js 14 (App Router) | Three separate apps: dashboard, checkout, marketing site. App Router enables server components for fast initial loads — critical for checkout conversion. |
| Tailwind CSS | Utility-first. No context switching between files. Faster than any component library for custom design systems. |
| shadcn/ui | Unstyled, accessible components. Copy-paste into your codebase — no black-box dependencies for a payment product. |
| Zustand | Minimal global state. No Redux overhead. Pairs perfectly with React Query for server state. |
| React Query (TanStack) | Server state management. Handles caching, refetching, optimistic updates for payment status. |
| Socket.io Client | Real-time payment status updates. Payer sees confirmation the moment Stellar confirms. |
| Zod | Shared validation schemas between frontend and backend. One schema, zero drift. |

## **Backend**

| Technology | Role & Reasoning |
| :---- | :---- |
| NestJS (Modular Monolith) | Structured, opinionated Node.js framework. Module system maps directly to your domain boundaries. Extract to microservices later without rewriting. |
| Prisma ORM | Type-safe database access. Migrations, relations, multi-schema. Best DX in the Node.js ecosystem. |
| PostgreSQL | Primary database. ACID compliant. Railway managed for solo dev. Multi-schema for domain isolation. |
| Redis | Quote TTL locking (30s), session cache, rate limiting, idempotency keys, BullMQ broker. |
| BullMQ | Async job queues: webhook delivery, email, payout batching, HTLC monitoring. Redis-backed. |
| Socket.io (NestJS Gateway) | WebSocket server for real-time events to dashboard and checkout frontends. |
| Passport.js \+ JWT | Merchant authentication. API key hashing. SEP-10 Stellar wallet auth. |
| Zod | Runtime validation on all API inputs. Shared with frontend. |
| Resend | Transactional email. Best developer experience, generous free tier. |
| Puppeteer | Invoice PDF generation. Renders React template to PDF server-side. |

## **Blockchain & Bridges**

| Technology | Role & Reasoning |
| :---- | :---- |
| @stellar/stellar-sdk | Core Stellar interactions: Horizon API, path payment routing, account management, transaction building. |
| @stellar/typescript-wallet-sdk | SEP-10 authentication, SEP-24 deposit/withdrawal (MoneyGram integration). |
| Soroban RPC Client | Call deployed Rust contracts from NestJS. Part of stellar-sdk. |
| Wormhole SDK | Cross-chain bridging for BNB, Solana, and non-CCTP chains. VAA (Verified Action Approval) messaging. |
| Circle CCTP SDK | Native USDC cross-chain for ETH, Base, Avalanche, Arbitrum, Polygon. Faster than Wormhole for USDC. |
| Layerswap API | Starknet bridging. Starknet is not on Wormhole or CCTP yet — Layerswap fills this gap. |
| MoneyGram SEP-24 | Fiat on/off ramp. 174 countries. Inherits MoneyGram's money transmitter licenses globally. |
| Ethers.js v6 | EVM chain interactions: HTLC contract deployment, event listening, transaction submission on EVM chains. |
| Viem | Lighter-weight EVM interaction for read-heavy operations. Pairs with Wagmi on frontend. |
| Wagmi | EVM wallet connection in checkout frontend (MetaMask, Coinbase Wallet, WalletConnect). |

## **Smart Contracts**

| Technology | Role & Reasoning |
| :---- | :---- |
| Rust \+ Soroban SDK | Stellar smart contracts. Soroban is Stellar's native WASM smart contract platform. Rust gives you memory safety and performance for financial code. |
| Soroban CLI | Local contract testing, testnet deployment, contract inspection. |
| Stellar CLI | Account management, trustlines, testnet funding during development. |
| Solidity (EVM HTLC) | HTLC contracts on ETH, Base, BNB, Polygon, Arbitrum, Avalanche. Standard ERC-20 compatible. |
| Hardhat | EVM contract development, testing, and deployment framework. |
| Cairo (Starknet HTLC) | HTLC contract on Starknet. Cairo is Starknet's native language. |
| OpenZeppelin | Audited base contracts for EVM HTLC. Never write your own ERC-20 transfer logic. |

## **Infrastructure**

| Technology | Role & Reasoning |
| :---- | :---- |
| Railway | Solo-optimized hosting. Managed Postgres, Redis, Docker deployments. Zero DevOps overhead to start. |
| Docker \+ Compose | Local development environment. Postgres \+ Redis \+ all services in one command. |
| Cloudflare | CDN, DDoS protection, DNS. Mandatory for a payment platform. Free tier covers you to significant scale. |
| Cloudflare R2 | Object storage for invoice PDFs and KYC documents. S3-compatible, zero egress fees. |
| GitHub Actions | CI/CD. Run tests, build Docker images, deploy to Railway on merge to main. |
| Sentry | Error tracking across frontend and backend. Free tier is sufficient to start. |

**03  ·  ARCHITECTURE**

# **Architecture Deep Dive**

## **Monorepo Structure**

Useroutr uses a NestJS native monorepo. All code lives in one repository. Shared types, Prisma schema, and Stellar wrappers are in the packages/ directory. Four Next.js apps and one NestJS API app live in apps/.

| Directory Structure |
| :---- |
| useroutr/ |
| ├── apps/ |
| │   ├── api/                          \# NestJS — single backend process |
| │   │   └── src/ |
| │   │       ├── main.ts               \# Bootstrap \+ Swagger |
| │   │       ├── app.module.ts         \# Root module |
| │   │       ├── modules/ |
| │   │       │   ├── auth/             \# JWT, API keys, SEP-10 |
| │   │       │   ├── merchants/        \# Merchant CRUD, settings |
| │   │       │   ├── payments/         \# Core payment lifecycle |
| │   │       │   ├── quotes/           \# Rate fetching, path finding, TTL lock |
| │   │       │   ├── payouts/          \# Single \+ bulk disbursements |
| │   │       │   ├── invoices/         \# Invoice CRUD \+ PDF \+ email |
| │   │       │   ├── links/            \# Payment link generation |
| │   │       │   ├── webhooks/         \# Outbound delivery \+ retry |
| │   │       │   ├── stellar/          \# Stellar SDK wrapper (shared module) |
| │   │       │   ├── bridge/           \# BridgeRouter — CCTP, Wormhole, Layerswap |
| │   │       │   ├── ramp/             \# MoneyGram SEP-24 integration |
| │   │       │   ├── relay/            \# HTLC watcher \+ secret propagation |
| │   │       │   ├── notifications/    \# Email (Resend), SMS |
| │   │       │   └── analytics/        \# Dashboard metrics queries |
| │   │       └── common/ |
| │   │           ├── guards/           \# JwtGuard, ApiKeyGuard |
| │   │           ├── interceptors/     \# LoggingInterceptor, TransformInterceptor |
| │   │           ├── filters/          \# GlobalExceptionFilter |
| │   │           ├── decorators/       \# @CurrentMerchant, @PublicRoute |
| │   │           └── pipes/            \# ZodValidationPipe |
| │   │ |
| │   ├── dashboard/                    \# Next.js 14 — merchant dashboard |
| │   ├── checkout/                     \# Next.js 14 — hosted checkout (consumer) |
| │   ├── www/                          \# Next.js 14 — marketing site tavio.io |
| │   └── docs/                         \# Next.js 14 — documentation site |
| │ |
| ├── packages/ |
| │   ├── types/                        \# Shared TypeScript types \+ Zod schemas |
| │   │   ├── payment.types.ts |
| │   │   ├── payout.types.ts |
| │   │   ├── quote.types.ts |
| │   │   └── chain.types.ts |
| │   ├── stellar/                      \# Shared Stellar SDK wrappers |
| │   │   ├── horizon.client.ts |
| │   │   ├── soroban.client.ts |
| │   │   └── path-payment.ts |
| │   └── ui/                           \# Shared React components |
| │ |
| ├── contracts/ |
| │   ├── soroban/                      \# Rust — Stellar contracts |
| │   │   ├── htlc/                     \# Hash Time Locked Contract |
| │   │   ├── settlement/               \# Settlement \+ path payment |
| │   │   ├── fee-collector/            \# Fee deduction |
| │   │   └── escrow/                   \# Dispute resolution |
| │   ├── evm/                          \# Solidity — EVM HTLC contracts |
| │   │   ├── contracts/HTLCEvm.sol |
| │   │   ├── hardhat.config.ts |
| │   │   └── deploy/ |
| │   └── starknet/                     \# Cairo — Starknet HTLC |
| │       └── src/htlc.cairo |
| │ |
| ├── prisma/ |
| │   └── schema.prisma |
| ├── docker-compose.yml |
| ├── package.json                      \# Workspace root (npm workspaces) |
| └── .env.example |

## **Payment Flow — End to End**

This is the complete lifecycle of a single non-custodial cross-chain payment. Every box below corresponds to code you will write.

| Example: Payer sends ETH on Base → Merchant receives USDC on BNB Chain 1\.  Merchant creates a payment request via Tavio API. Receives a checkout URL. 2\.  Payer opens checkout URL. Sees order summary and selects "EVM Wallet — Base". 3\.  Quote Service fetches ETH/USDC rate. Calculates Useroutr fee (basis points). Locks quote in Redis for 30 seconds. 4\.  Checkout displays: "Send 0.021 ETH on Base → Merchant receives 49.77 USDC on BNB". 30s countdown. 5\.  Payer approves transaction in MetaMask. Calls lock() on Useroutr's EVM HTLC contract on Base. 6\.  HTLC contract on Base locks 0.021 ETH. Emits Locked(lockId, hashlock, amount, timeout=24h) event. 7\.  Relay Service (NestJS) detects Locked event via Ethereum event listener. 8\.  Relay calls Soroban Settlement Contract: "A payment is locked on Base with hashlock H". 9\.  Settlement Contract: executes Stellar path payment ETH(wrapped) → USDC. Deducts Useroutr fee. Calls HTLC Contract: lock USDC for merchant with same hashlock H, timeout=12h. 10\. Relay Service detects Stellar HTLC lock. Calls withdraw(lockId, secret) on Stellar HTLC — reveals S. 11\. Stellar HTLC releases USDC to merchant's Stellar address. Emits Withdrawn(lockId, preimage=S) event. 12\. Relay Service detects Withdrawn event on Stellar. S is now public. 13\. Relay calls withdraw(sourceLockId, S) on Base HTLC contract. Useroutr liquidity pool reimbursed. 14\. Payment status updated to COMPLETED. Webhook fired to merchant. Dashboard updates via WebSocket. |
| :---- |

## **The Bridge Router — Chain Support Matrix**

| Chain | Bridge Provider |
| :---- | :---- |
| Ethereum | Circle CCTP |
| Base | Circle CCTP |
| Avalanche | Circle CCTP |
| Arbitrum | Circle CCTP |
| Polygon | Circle CCTP |
| BNB Chain | Wormhole |
| Solana | Wormhole |
| Starknet | Layerswap API |
| Stellar (native) | No bridge needed |

**04  ·  DATABASE**

# **Database Schema**

Single PostgreSQL database. Each domain uses a separate Prisma model group. Schema is defined in prisma/schema.prisma. Run prisma migrate dev during development. Run prisma migrate deploy in CI/CD.

| prisma/schema.prisma |
| :---- |
| // prisma/schema.prisma |
|   |
| generator client { |
|   provider \= "prisma-client-js" |
| } |
|   |
| datasource db { |
|   provider \= "postgresql" |
|   url      \= env("DATABASE\_URL") |
| } |
|   |
| // ── Auth & Merchants ───────────────────────────────────────── |
|   |
| model Merchant { |
|   id                String    @id @default(cuid()) |
|   name              String |
|   email             String    @unique |
|   passwordHash      String |
|   apiKeyHash        String?   @unique |
|   webhookUrl        String? |
|   webhookSecret     String? |
|   settlementAsset   String    @default("USDC") |
|   settlementAddress String?   // Stellar G... address OR EVM 0x... |
|   settlementChain   String    @default("stellar") |
|   kybStatus         KybStatus @default(PENDING) |
|   feeBps            Int       @default(50) // 0.5% |
|   createdAt         DateTime  @default(now()) |
|   updatedAt         DateTime  @updatedAt |
|   payments          Payment\[\] |
|   payouts           Payout\[\] |
|   invoices          Invoice\[\] |
|   paymentLinks      PaymentLink\[\] |
|   teamMembers       TeamMember\[\] |
| } |
|   |
| model TeamMember { |
|   id         String   @id @default(cuid()) |
|   merchantId String |
|   email      String |
|   role       TeamRole |
|   merchant   Merchant @relation(fields:\[merchantId\], references:\[id\]) |
| } |
|   |
| enum KybStatus { PENDING SUBMITTED APPROVED REJECTED } |
| enum TeamRole  { OWNER ADMIN DEVELOPER FINANCE VIEWER } |
|   |
| // ── Quotes ─────────────────────────────────────────────────── |
|   |
| model Quote { |
|   id           String   @id @default(cuid()) |
|   fromChain    String |
|   fromAsset    String |
|   fromAmount   Decimal  @db.Decimal(36,18) |
|   toChain      String |
|   toAsset      String |
|   toAmount     Decimal  @db.Decimal(36,18) |
|   rate         Decimal  @db.Decimal(36,18) |
|   feeBps       Int |
|   feeAmount    Decimal  @db.Decimal(36,18) |
|   stellarPath  Json?    // path payment hops |
|   bridgeRoute  String?  // "cctp" | "wormhole" | "layerswap" |
|   lockedAt     DateTime @default(now()) |
|   expiresAt    DateTime // lockedAt \+ 30s |
|   used         Boolean  @default(false) |
|   payment      Payment? |
| } |
|   |
| // ── Payments ───────────────────────────────────────────────── |
|   |
| model Payment { |
|   id                  String        @id @default(cuid()) |
|   merchantId          String |
|   quoteId             String        @unique |
|   status              PaymentStatus @default(PENDING) |
|   // Source side |
|   sourceChain         String |
|   sourceAsset         String |
|   sourceAmount        Decimal       @db.Decimal(36,18) |
|   sourceAddress       String?       // payer wallet address |
|   sourceLockId        String?       // HTLC lock ID on source chain |
|   sourceTxHash        String? |
|   // Settlement side |
|   stellarLockId       String?       // Soroban HTLC lock ID |
|   stellarTxHash       String? |
|   // Destination side |
|   destChain           String |
|   destAsset           String |
|   destAmount          Decimal       @db.Decimal(36,18) |
|   destAddress         String        // merchant receiving address |
|   destTxHash          String? |
|   // HTLC fields |
|   hashlock            String?       // sha256 of secret |
|   secretRevealed      Boolean       @default(false) |
|   // Metadata |
|   metadata            Json? |
|   refundedAt          DateTime? |
|   completedAt         DateTime? |
|   createdAt           DateTime      @default(now()) |
|   updatedAt           DateTime      @updatedAt |
|   merchant            Merchant      @relation(fields:\[merchantId\], references:\[id\]) |
|   quote               Quote         @relation(fields:\[quoteId\], references:\[id\]) |
|   webhookEvents       WebhookEvent\[\] |
| } |
|   |
| enum PaymentStatus { |
|   PENDING QUOTE\_LOCKED SOURCE\_LOCKED STELLAR\_LOCKED |
|   PROCESSING COMPLETED REFUNDING REFUNDED EXPIRED FAILED |
| } |
|   |
| // ── Payment Links ───────────────────────────────────────────── |
|   |
| model PaymentLink { |
|   id          String    @id @default(cuid()) |
|   merchantId  String |
|   amount      Decimal?  @db.Decimal(36,18) // null \= open amount |
|   currency    String    @default("USD") |
|   description String? |
|   singleUse   Boolean   @default(false) |
|   usedCount   Int       @default(0) |
|   expiresAt   DateTime? |
|   active      Boolean   @default(true) |
|   createdAt   DateTime  @default(now()) |
|   merchant    Merchant  @relation(fields:\[merchantId\], references:\[id\]) |
| } |
|   |
| // ── Invoices ────────────────────────────────────────────────── |
|   |
| model Invoice { |
|   id            String        @id @default(cuid()) |
|   merchantId    String |
|   customerEmail String |
|   customerName  String? |
|   lineItems     Json          // \[{description, qty, unitPrice}\] |
|   subtotal      Decimal       @db.Decimal(36,18) |
|   taxRate       Decimal?      @db.Decimal(5,4) |
|   taxAmount     Decimal?      @db.Decimal(36,18) |
|   discount      Decimal?      @db.Decimal(36,18) |
|   total         Decimal       @db.Decimal(36,18) |
|   currency      String        @default("USD") |
|   status        InvoiceStatus @default(DRAFT) |
|   dueDate       DateTime? |
|   pdfUrl        String? |
|   paidAt        DateTime? |
|   paymentId     String? |
|   createdAt     DateTime      @default(now()) |
|   merchant      Merchant      @relation(fields:\[merchantId\], references:\[id\]) |
| } |
|   |
| enum InvoiceStatus { DRAFT SENT VIEWED PARTIALLY\_PAID PAID OVERDUE CANCELLED } |
|   |
| // ── Payouts ─────────────────────────────────────────────────── |
|   |
| model Payout { |
|   id              String       @id @default(cuid()) |
|   merchantId      String |
|   recipientName   String |
|   destinationType DestType |
|   destination     Json         // {type, account, routing, ...} |
|   amount          Decimal      @db.Decimal(36,18) |
|   currency        String |
|   status          PayoutStatus @default(PENDING) |
|   stellarTxHash   String? |
|   scheduledAt     DateTime? |
|   completedAt     DateTime? |
|   failureReason   String? |
|   batchId         String? |
|   createdAt       DateTime     @default(now()) |
|   merchant        Merchant     @relation(fields:\[merchantId\], references:\[id\]) |
| } |
|   |
| enum DestType    { BANK\_ACCOUNT MOBILE\_MONEY CRYPTO\_WALLET STELLAR } |
| enum PayoutStatus { PENDING PROCESSING COMPLETED FAILED CANCELLED } |
|   |
| // ── Webhooks ────────────────────────────────────────────────── |
|   |
| model WebhookEvent { |
|   id            String      @id @default(cuid()) |
|   merchantId    String |
|   paymentId     String? |
|   eventType     String      // "payment.completed" etc. |
|   payload       Json |
|   status        WebhookStatus @default(PENDING) |
|   attempts      Int         @default(0) |
|   lastAttemptAt DateTime? |
|   nextRetryAt   DateTime? |
|   createdAt     DateTime    @default(now()) |
|   payment       Payment?    @relation(fields:\[paymentId\], references:\[id\]) |
| } |
|   |
| enum WebhookStatus { PENDING DELIVERED FAILED EXHAUSTED } |

**05  ·  SMART CONTRACTS**

# **Smart Contracts**

Useroutr deploys four Soroban contracts on Stellar and one HTLC contract on each supported EVM chain. The Soroban contracts are the core of Useroutr's non-custodial guarantee. They must be audited before mainnet deployment.

*🔴  These contracts handle real user funds. Never deploy to mainnet without a professional security audit. Budget $15,000–$40,000 for an audit from OtterSec, Halborn, or Trail of Bits.*

## **5.1  Soroban HTLC Contract (Rust)**

The Hash Time Locked Contract is the atomic swap primitive. It is the most critical contract in the system. All other contracts depend on it.

| Rust — contracts/soroban/htlc/src/lib.rs |
| :---- |
| // contracts/soroban/htlc/src/lib.rs |
|   |
| use soroban\_sdk::{ |
|     contract, contractimpl, contracttype, |
|     Address, Bytes, BytesN, Env, Symbol, token, |
|     Vec, Map, panic\_with\_error, contracterror |
| }; |
|   |
| \#\[contracterror\] |
| \#\[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)\] |
| \#\[repr(u32)\] |
| pub enum HTLCError { |
|     LockNotFound    \= 1, |
|     InvalidPreimage \= 2, |
|     LockExpired     \= 3, |
|     AlreadyWithdrawn \= 4, |
|     AlreadyRefunded \= 5, |
|     NotYetExpired   \= 6, |
|     Unauthorized    \= 7, |
| } |
|   |
| \#\[contracttype\] |
| \#\[derive(Clone)\] |
| pub struct LockEntry { |
|     pub sender:    Address, |
|     pub receiver:  Address, |
|     pub token:     Address, |
|     pub amount:    i128, |
|     pub hashlock:  BytesN\<32\>, |
|     pub timelock:  u64, |
|     pub withdrawn: bool, |
|     pub refunded:  bool, |
| } |
|   |
| \#\[contracttype\] |
| pub enum DataKey { |
|     Lock(BytesN\<32\>), |
| } |
|   |
| \#\[contract\] |
| pub struct HTLCContract; |
|   |
| \#\[contractimpl\] |
| impl HTLCContract { |
|   |
|     /// Lock funds. Returns the lockId. |
|     pub fn lock( |
|         env: Env, |
|         sender: Address, |
|         receiver: Address, |
|         token: Address, |
|         amount: i128, |
|         hashlock: BytesN\<32\>, |
|         timelock: u64, |
|     ) \-\> BytesN\<32\> { |
|         sender.require\_auth(); |
|         assert\!(amount \> 0, "amount must be positive"); |
|         assert\!(timelock \> env.ledger().timestamp(), "timelock must be future"); |
|   |
|         // Transfer from sender to contract |
|         token::Client::new(\&env, \&token) |
|             .transfer(\&sender, \&env.current\_contract\_address(), \&amount); |
|   |
|         // Deterministic lock ID from hashlock \+ timestamp |
|         let mut id\_input \= Bytes::new(\&env); |
|         id\_input.append(\&Bytes::from\_array(\&env, \&hashlock.to\_array())); |
|         id\_input.append(\&Bytes::from\_array( |
|             \&env, |
|             \&env.ledger().timestamp().to\_be\_bytes() |
|         )); |
|         let lock\_id \= env.crypto().sha256(\&id\_input); |
|   |
|         env.storage().persistent().set( |
|             \&DataKey::Lock(lock\_id.clone()), |
|             \&LockEntry { sender, receiver, token, amount, hashlock, timelock, |
|                          withdrawn: false, refunded: false } |
|         ); |
|   |
|         // Emit event for relay to detect |
|         env.events().publish( |
|             (Symbol::new(\&env, "locked"),), |
|             (lock\_id.clone(), amount, timelock) |
|         ); |
|   |
|         lock\_id |
|     } |
|   |
|     /// Withdraw by revealing the secret preimage. |
|     pub fn withdraw(env: Env, lock\_id: BytesN\<32\>, preimage: Bytes) \-\> bool { |
|         let mut entry: LockEntry \= env.storage().persistent() |
|             .get(\&DataKey::Lock(lock\_id.clone())) |
|             .unwrap\_or\_else(|| panic\_with\_error\!(\&env, HTLCError::LockNotFound)); |
|   |
|         if entry.withdrawn { panic\_with\_error\!(\&env, HTLCError::AlreadyWithdrawn) } |
|         if entry.refunded  { panic\_with\_error\!(\&env, HTLCError::AlreadyRefunded) } |
|   |
|         let hash \= env.crypto().sha256(\&preimage); |
|         if hash \!= entry.hashlock { panic\_with\_error\!(\&env, HTLCError::InvalidPreimage) } |
|   |
|         if env.ledger().timestamp() \>= entry.timelock { |
|             panic\_with\_error\!(\&env, HTLCError::LockExpired) |
|         } |
|   |
|         token::Client::new(\&env, \&entry.token) |
|             .transfer(\&env.current\_contract\_address(), \&entry.receiver, \&entry.amount); |
|   |
|         entry.withdrawn \= true; |
|         env.storage().persistent().set(\&DataKey::Lock(lock\_id.clone()), \&entry); |
|   |
|         // Publish preimage — relay watches this to unlock source chain |
|         env.events().publish( |
|             (Symbol::new(\&env, "withdrawn"),), |
|             (lock\_id, preimage) |
|         ); |
|   |
|         true |
|     } |
|   |
|     /// Refund after timelock expiry. |
|     pub fn refund(env: Env, lock\_id: BytesN\<32\>) \-\> bool { |
|         let mut entry: LockEntry \= env.storage().persistent() |
|             .get(\&DataKey::Lock(lock\_id.clone())) |
|             .unwrap\_or\_else(|| panic\_with\_error\!(\&env, HTLCError::LockNotFound)); |
|   |
|         if entry.withdrawn { panic\_with\_error\!(\&env, HTLCError::AlreadyWithdrawn) } |
|         if entry.refunded  { panic\_with\_error\!(\&env, HTLCError::AlreadyRefunded) } |
|         if env.ledger().timestamp() \< entry.timelock { |
|             panic\_with\_error\!(\&env, HTLCError::NotYetExpired) |
|         } |
|   |
|         token::Client::new(\&env, \&entry.token) |
|             .transfer(\&env.current\_contract\_address(), \&entry.sender, \&entry.amount); |
|   |
|         entry.refunded \= true; |
|         env.storage().persistent().set(\&DataKey::Lock(lock\_id.clone()), \&entry); |
|         env.events().publish((Symbol::new(\&env, "refunded"),), (lock\_id,)); |
|   |
|         true |
|     } |
|   |
|     pub fn get\_lock(env: Env, lock\_id: BytesN\<32\>) \-\> LockEntry { |
|         env.storage().persistent() |
|             .get(\&DataKey::Lock(lock\_id)) |
|             .unwrap\_or\_else(|| panic\_with\_error\!(\&env, HTLCError::LockNotFound)) |
|     } |
| } |

## **5.2  Fee Collector Contract (Rust)**

| Rust — contracts/soroban/fee-collector/src/lib.rs |
| :---- |
| // contracts/soroban/fee-collector/src/lib.rs |
|   |
| use soroban\_sdk::{contract, contractimpl, contracttype, Address, Env, token}; |
|   |
| \#\[contracttype\] |
| pub enum DataKey { Admin, FeeBps, Treasury } |
|   |
| \#\[contract\] |
| pub struct FeeCollectorContract; |
|   |
| \#\[contractimpl\] |
| impl FeeCollectorContract { |
|   |
|     pub fn initialize(env: Env, admin: Address, fee\_bps: u32, treasury: Address) { |
|         admin.require\_auth(); |
|         env.storage().instance().set(\&DataKey::Admin,    \&admin); |
|         env.storage().instance().set(\&DataKey::FeeBps,   \&fee\_bps); |
|         env.storage().instance().set(\&DataKey::Treasury, \&treasury); |
|     } |
|   |
|     /// Deduct fee from amount. Returns (merchant\_amount, fee\_amount). |
|     pub fn deduct( |
|         env: Env, |
|         token: Address, |
|         gross\_amount: i128, |
|         merchant: Address, |
|     ) \-\> (i128, i128) { |
|         let fee\_bps: u32 \= env.storage().instance().get(\&DataKey::FeeBps).unwrap(); |
|         let treasury: Address \= env.storage().instance().get(\&DataKey::Treasury).unwrap(); |
|   |
|         let fee\_amount \= (gross\_amount \* fee\_bps as i128) / 10\_000; |
|         let merchant\_amount \= gross\_amount \- fee\_amount; |
|   |
|         let client \= token::Client::new(\&env, \&token); |
|         client.transfer(\&env.current\_contract\_address(), \&merchant, \&merchant\_amount); |
|         client.transfer(\&env.current\_contract\_address(), \&treasury, \&fee\_amount); |
|   |
|         (merchant\_amount, fee\_amount) |
|     } |
|   |
|     /// Admin can update fee rate (max 200 bps \= 2%) |
|     pub fn set\_fee\_bps(env: Env, new\_fee\_bps: u32) { |
|         let admin: Address \= env.storage().instance().get(\&DataKey::Admin).unwrap(); |
|         admin.require\_auth(); |
|         assert\!(new\_fee\_bps \<= 200, "max fee is 2%"); |
|         env.storage().instance().set(\&DataKey::FeeBps, \&new\_fee\_bps); |
|     } |
|   |
|     pub fn get\_fee\_bps(env: Env) \-\> u32 { |
|         env.storage().instance().get(\&DataKey::FeeBps).unwrap\_or(50) |
|     } |
| } |

## **5.3  EVM HTLC Contract (Solidity)**

Deployed on every EVM chain Useroutr supports: ETH, Base, BNB, Polygon, Arbitrum, Avalanche.

| Solidity — contracts/evm/contracts/HTLCEvm.sol |
| :---- |
| // contracts/evm/contracts/HTLCEvm.sol |
| // SPDX-License-Identifier: MIT |
| pragma solidity ^0.8.20; |
|   |
| import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; |
| import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; |
| import "@openzeppelin/contracts/utils/ReentrancyGuard.sol"; |
|   |
| contract HTLCEvm is ReentrancyGuard { |
|     using SafeERC20 for IERC20; |
|   |
|     struct LockEntry { |
|         address sender; |
|         address receiver; |
|         address token; |
|         uint256 amount; |
|         bytes32 hashlock;   // sha256 of secret |
|         uint256 timelock;   // unix timestamp |
|         bool withdrawn; |
|         bool refunded; |
|     } |
|   |
|     mapping(bytes32 \=\> LockEntry) public locks; |
|   |
|     event Locked(bytes32 indexed lockId, address indexed sender, |
|                  address indexed receiver, uint256 amount, bytes32 hashlock, |
|                  uint256 timelock, address token); |
|     event Withdrawn(bytes32 indexed lockId, bytes32 preimage); |
|     event Refunded(bytes32 indexed lockId); |
|   |
|     error LockNotFound(); |
|     error InvalidPreimage(); |
|     error LockExpired(); |
|     error AlreadyWithdrawn(); |
|     error AlreadyRefunded(); |
|     error NotYetExpired(); |
|   |
|     function lock( |
|         address receiver, |
|         address token, |
|         uint256 amount, |
|         bytes32 hashlock, |
|         uint256 timelock |
|     ) external nonReentrant returns (bytes32 lockId) { |
|         require(amount \> 0, "amount must be positive"); |
|         require(timelock \> block.timestamp, "timelock must be future"); |
|   |
|         lockId \= keccak256(abi.encodePacked( |
|             msg.sender, receiver, token, amount, hashlock, timelock, block.timestamp |
|         )); |
|   |
|         IERC20(token).safeTransferFrom(msg.sender, address(this), amount); |
|   |
|         locks\[lockId\] \= LockEntry({ |
|             sender: msg.sender, receiver: receiver, token: token, |
|             amount: amount, hashlock: hashlock, timelock: timelock, |
|             withdrawn: false, refunded: false |
|         }); |
|   |
|         emit Locked(lockId, msg.sender, receiver, amount, hashlock, timelock, token); |
|     } |
|   |
|     function withdraw(bytes32 lockId, bytes32 preimage) |
|         external nonReentrant returns (bool) { |
|         LockEntry storage entry \= locks\[lockId\]; |
|         if (entry.sender \== address(0)) revert LockNotFound(); |
|         if (entry.withdrawn)           revert AlreadyWithdrawn(); |
|         if (entry.refunded)            revert AlreadyRefunded(); |
|         if (sha256(abi.encodePacked(preimage)) \!= entry.hashlock) |
|                                        revert InvalidPreimage(); |
|         if (block.timestamp \>= entry.timelock) revert LockExpired(); |
|   |
|         entry.withdrawn \= true; |
|         IERC20(entry.token).safeTransfer(entry.receiver, entry.amount); |
|         emit Withdrawn(lockId, preimage); |
|         return true; |
|     } |
|   |
|     function refund(bytes32 lockId) external nonReentrant returns (bool) { |
|         LockEntry storage entry \= locks\[lockId\]; |
|         if (entry.sender \== address(0)) revert LockNotFound(); |
|         if (entry.withdrawn)           revert AlreadyWithdrawn(); |
|         if (entry.refunded)            revert AlreadyRefunded(); |
|         if (block.timestamp \< entry.timelock) revert NotYetExpired(); |
|   |
|         entry.refunded \= true; |
|         IERC20(entry.token).safeTransfer(entry.sender, entry.amount); |
|         emit Refunded(lockId); |
|         return true; |
|     } |
| } |

**06  ·  BACKEND MODULES**

# **NestJS Module Reference**

## **6.1  Bridge Router**

The BridgeRouter is the abstraction that hides all bridge complexity from the payment service. It picks the right provider per route automatically.

| TypeScript — Bridge Router |
| :---- |
| // apps/api/src/modules/bridge/bridge-router.service.ts |
|   |
| import { Injectable } from "@nestjs/common"; |
| import { Chain, BridgeRoute, BridgeInParams, BridgeOutParams } from "@useroutr/types"; |
| import { CctpService }       from "./providers/cctp.service"; |
| import { WormholeService }   from "./providers/wormhole.service"; |
| import { LayerswapService }  from "./providers/layerswap.service"; |
|   |
| // Chains supported by Circle CCTP natively |
| const CCTP\_CHAINS \= new Set(\["ethereum","base","avalanche","arbitrum","polygon"\]); |
|   |
| @Injectable() |
| export class BridgeRouter { |
|   constructor( |
|     private readonly cctp:      CctpService, |
|     private readonly wormhole:  WormholeService, |
|     private readonly layerswap: LayerswapService, |
|   ) {} |
|   |
|   findRoute(from: Chain, to: Chain, asset: string): BridgeRoute { |
|     // Stellar-native: no bridge needed |
|     if (from \=== "stellar" && to \=== "stellar") { |
|       return { provider: "stellar\_native", estimatedTimeMs: 5000, estimatedFeeBps: 0 }; |
|     } |
|     // Starknet: Layerswap |
|     if (from \=== "starknet" || to \=== "starknet") { |
|       return { provider: "layerswap", estimatedTimeMs: 120\_000, estimatedFeeBps: 10 }; |
|     } |
|     // CCTP-supported chains: faster and native USDC |
|     if ( |
|       (CCTP\_CHAINS.has(from) || from \=== "stellar") && |
|       (CCTP\_CHAINS.has(to)   || to   \=== "stellar") && |
|       asset \=== "USDC" |
|     ) { |
|       return { provider: "cctp", estimatedTimeMs: 30\_000, estimatedFeeBps: 0 }; |
|     } |
|     // Default: Wormhole |
|     return { provider: "wormhole", estimatedTimeMs: 60\_000, estimatedFeeBps: 5 }; |
|   } |
|   |
|   async bridgeIn(params: BridgeInParams): Promise\<{ txHash: string; bridgeTxId: string }\> { |
|     const route \= this.findRoute(params.fromChain, "stellar", params.asset); |
|     switch (route.provider) { |
|       case "cctp":      return this.cctp.bridgeToStellar(params); |
|       case "wormhole":  return this.wormhole.bridgeToStellar(params); |
|       case "layerswap": return this.layerswap.bridgeToStellar(params); |
|       default:          throw new Error(\`Unknown provider: ${route.provider}\`); |
|     } |
|   } |
|   |
|   async bridgeOut(params: BridgeOutParams): Promise\<{ txHash: string }\> { |
|     const route \= this.findRoute("stellar", params.toChain, params.asset); |
|     switch (route.provider) { |
|       case "cctp":         return this.cctp.bridgeFromStellar(params); |
|       case "wormhole":     return this.wormhole.bridgeFromStellar(params); |
|       case "layerswap":    return this.layerswap.bridgeFromStellar(params); |
|       case "stellar\_native": return this.stellarDirectTransfer(params); |
|       default: throw new Error(\`Unknown provider: ${route.provider}\`); |
|     } |
|   } |
|   |
|   private async stellarDirectTransfer(params: BridgeOutParams) { |
|     // Direct Stellar path payment — no bridge needed |
|     // Handled by StellarService |
|     return { txHash: "handled\_by\_stellar\_service" }; |
|   } |
| } |

## **6.2  Relay Service**

The Relay Service is the "nervous system" of Useroutr. It watches both the source chain and Stellar for HTLC events and automatically propagates secrets to complete swaps. It runs as a BullMQ worker.

| TypeScript — Relay Service |
| :---- |
| // apps/api/src/modules/relay/relay.service.ts |
|   |
| import { Injectable, OnModuleInit, Logger } from "@nestjs/common"; |
| import { InjectQueue } from "@nestjs/bullmq"; |
| import { Queue } from "bullmq"; |
| import { StellarService }  from "../stellar/stellar.service"; |
| import { BridgeRouter }    from "../bridge/bridge-router.service"; |
| import { PaymentsService } from "../payments/payments.service"; |
| import { PaymentStatus }   from "@prisma/client"; |
|   |
| @Injectable() |
| export class RelayService implements OnModuleInit { |
|   private readonly logger \= new Logger(RelayService.name); |
|   |
|   constructor( |
|     private readonly stellar:  StellarService, |
|     private readonly bridge:   BridgeRouter, |
|     private readonly payments: PaymentsService, |
|     @InjectQueue("relay") private readonly relayQueue: Queue, |
|   ) {} |
|   |
|   async onModuleInit() { |
|     // Start watching Stellar HTLC contract events |
|     this.watchStellarHTLC(); |
|     // Schedule expired lock watchdog every 60 seconds |
|     await this.relayQueue.add("watchExpired", {}, { |
|       repeat: { every: 60\_000 }, |
|     }); |
|   } |
|   |
|   // Stream events from the Soroban HTLC contract |
|   private async watchStellarHTLC() { |
|     await this.stellar.streamContractEvents( |
|       process.env.SOROBAN\_HTLC\_CONTRACT\_ID\!, |
|       async (event) \=\> { |
|         if (event.type \=== "withdrawn") { |
|           await this.handleStellarWithdrawal(event); |
|         } |
|       } |
|     ); |
|   } |
|   |
|   // Secret revealed on Stellar → use it on source chain |
|   private async handleStellarWithdrawal(event: { |
|     lockId: string; |
|     preimage: string; |
|   }) { |
|     const payment \= await this.payments.findByStellarLockId(event.lockId); |
|     if (\!payment) { |
|       this.logger.warn(\`No payment found for stellarLockId: ${event.lockId}\`); |
|       return; |
|     } |
|   |
|     this.logger.log(\`Secret revealed for payment ${payment.id}. Unlocking source.\`); |
|   |
|     try { |
|       // Complete the source chain HTLC using the revealed secret |
|       await this.bridge.completeSourceLock({ |
|         chain:        payment.sourceChain, |
|         lockId:       payment.sourceLockId\!, |
|         preimage:     event.preimage, |
|       }); |
|   |
|       await this.payments.updateStatus(payment.id, PaymentStatus.COMPLETED, { |
|         completedAt:     new Date(), |
|         secretRevealed:  true, |
|       }); |
|   |
|       // Fire webhook and WebSocket update |
|       await this.payments.notifyCompletion(payment.id); |
|   |
|     } catch (err) { |
|       this.logger.error(\`Failed to complete source lock: ${err.message}\`, err.stack); |
|     } |
|   } |
|   |
|   // Watchdog: refund expired Stellar locks |
|   async processExpiredLocks() { |
|     const expired \= await this.payments.findExpiredPending(); |
|     for (const payment of expired) { |
|       try { |
|         await this.stellar.refundHTLC(payment.stellarLockId\!); |
|         await this.payments.updateStatus(payment.id, PaymentStatus.REFUNDED, { |
|           refundedAt: new Date(), |
|         }); |
|         this.logger.log(\`Refunded expired payment ${payment.id}\`); |
|       } catch (err) { |
|         this.logger.error(\`Refund failed for ${payment.id}: ${err.message}\`); |
|       } |
|     } |
|   } |
| } |

## **6.3  Quote Service**

Quotes are locked in Redis with a 30-second TTL. If the quote expires before the payer confirms, they must re-quote. This protects Useroutr from slippage and protects the payer from stale rates.

| TypeScript — Quote Service |
| :---- |
| // apps/api/src/modules/quotes/quotes.service.ts |
|   |
| import { Injectable, BadRequestException } from "@nestjs/common"; |
| import { InjectRedis } from "@nestjs-modules/ioredis"; |
| import Redis from "ioredis"; |
| import { PrismaService } from "../prisma/prisma.service"; |
| import { StellarService } from "../stellar/stellar.service"; |
| import { CreateQuoteDto } from "./dto/create-quote.dto"; |
|   |
| const QUOTE\_TTL\_SECONDS \= 30; |
|   |
| @Injectable() |
| export class QuotesService { |
|   constructor( |
|     @InjectRedis() private readonly redis: Redis, |
|     private readonly prisma:   PrismaService, |
|     private readonly stellar:  StellarService, |
|   ) {} |
|   |
|   async createQuote(dto: CreateQuoteDto) { |
|     // 1\. Find optimal path on Stellar |
|     const paths \= await this.stellar.findStrictSendPaths({ |
|       sourceAsset:  dto.fromAsset, |
|       sourceAmount: dto.fromAmount, |
|       destAsset:    dto.toAsset, |
|     }); |
|   |
|     if (\!paths.length) { |
|       throw new BadRequestException("No conversion path found for this asset pair."); |
|     } |
|   |
|     const bestPath \= paths\[0\]; |
|     const feeBps    \= 50; // 0.5% default — overridden by merchant settings |
|     const feeAmount \= (bestPath.destinationAmount \* BigInt(feeBps)) / 10000n; |
|     const netAmount \= bestPath.destinationAmount \- feeAmount; |
|   |
|     // 2\. Persist quote |
|     const quote \= await this.prisma.quote.create({ |
|       data: { |
|         fromChain:   dto.fromChain, |
|         fromAsset:   dto.fromAsset, |
|         fromAmount:  dto.fromAmount.toString(), |
|         toChain:     dto.toChain, |
|         toAsset:     dto.toAsset, |
|         toAmount:    netAmount.toString(), |
|         rate:        bestPath.rate.toString(), |
|         feeBps, |
|         feeAmount:   feeAmount.toString(), |
|         stellarPath: bestPath.path, |
|         expiresAt:   new Date(Date.now() \+ QUOTE\_TTL\_SECONDS \* 1000), |
|       } |
|     }); |
|   |
|     // 3\. Lock in Redis with TTL |
|     await this.redis.setex( |
|       \`quote:${quote.id}\`, |
|       QUOTE\_TTL\_SECONDS, |
|       JSON.stringify({ id: quote.id, locked: true }) |
|     ); |
|   |
|     return { ...quote, expiresInSeconds: QUOTE\_TTL\_SECONDS }; |
|   } |
|   |
|   async validateAndConsume(quoteId: string) { |
|     const locked \= await this.redis.get(\`quote:${quoteId}\`); |
|     if (\!locked) throw new BadRequestException("Quote expired. Please request a new quote."); |
|   |
|     const quote \= await this.prisma.quote.findUnique({ where: { id: quoteId } }); |
|     if (\!quote)       throw new BadRequestException("Quote not found."); |
|     if (quote.used)   throw new BadRequestException("Quote already used."); |
|     if (new Date() \> quote.expiresAt) throw new BadRequestException("Quote expired."); |
|   |
|     // Consume the quote |
|     await this.prisma.quote.update({ where: { id: quoteId }, data: { used: true } }); |
|     await this.redis.del(\`quote:${quoteId}\`); |
|   |
|     return quote; |
|   } |
| } |

**07  ·  MONEYGRAM INTEGRATION**

# **MoneyGram Ramp Integration**

MoneyGram's ramp is a massive shortcut for Useroutr's regulatory situation. By integrating as a technical partner using their SEP-24 API, Useroutr inherits MoneyGram's money transmitter licenses across 174 countries without applying for a single license itself. This is the single most important partnership in the entire architecture.

| What MoneyGram gives you On-ramp: Cash or bank transfer → USDC on Stellar. Payer visits any MoneyGram agent (hundreds of thousands globally). Off-ramp: USDC on Stellar → cash or bank transfer. Available in 174 countries. $5 min / $2,500 max per transaction. KYC handled by MoneyGram's webview. Useroutr never owns KYC data. Regulated: MoneyGram is licensed as a Money Transmitter in all 50 US states and globally. You operate under their umbrella. Built on Stellar SEP-10/24: The same standards your wallet SDK already implements. |
| :---- |

## **Integration Steps**

| TypeScript — MoneyGram Service |
| :---- |
| // apps/api/src/modules/ramp/moneygram.service.ts |
|   |
| import { Injectable } from "@nestjs/common"; |
| import { Wallet } from "@stellar/typescript-wallet-sdk"; |
|   |
| @Injectable() |
| export class MoneygramService { |
|   private wallet: Wallet; |
|   |
|   constructor() { |
|     this.wallet \= Wallet.TestNet(); // swap to Wallet.MainNet() for production |
|   } |
|   |
|   // Step 1: Authenticate with MoneyGram using SEP-10 |
|   async authenticate(userPublicKey: string) { |
|     const anchor \= this.wallet.anchor({ |
|       homeDomain: "extstellar.moneygram.com", // testnet |
|       // homeDomain: "stellar.moneygram.com" // mainnet |
|     }); |
|   |
|     const auth \= await anchor.sep10(); |
|     // For custodial: use merchant signing key |
|     // For non-custodial: user signs with their own key |
|     const token \= await auth.authenticate({ accountKp: userPublicKey }); |
|     return token; |
|   } |
|   |
|   // Step 2: Initiate an on-ramp (cash-in) transaction |
|   async initiateOnRamp(params: { |
|     token: string; |
|     amount: string; |
|     userPublicKey: string; |
|   }) { |
|     const anchor \= this.wallet.anchor({ homeDomain: "extstellar.moneygram.com" }); |
|     const sep24  \= await anchor.sep24(); |
|   |
|     // Returns a URL to MoneyGram's hosted KYC+transaction UI |
|     const deposit \= await sep24.deposit({ |
|       authToken:    params.token, |
|       assetCode:    "USDC", |
|       account:      params.userPublicKey, |
|       extraFields:  { amount: params.amount }, |
|     }); |
|   |
|     // Open this URL in a webview (iframe or redirect) |
|     return { interactiveUrl: deposit.url, transactionId: deposit.id }; |
|   } |
|   |
|   // Step 3: Initiate an off-ramp (cash-out) transaction |
|   async initiateOffRamp(params: { |
|     token: string; |
|     amount: string; |
|     userPublicKey: string; |
|   }) { |
|     const anchor \= this.wallet.anchor({ homeDomain: "extstellar.moneygram.com" }); |
|     const sep24  \= await anchor.sep24(); |
|   |
|     const withdrawal \= await sep24.withdraw({ |
|       authToken:    params.token, |
|       assetCode:    "USDC", |
|       account:      params.userPublicKey, |
|       extraFields:  { amount: params.amount }, |
|     }); |
|   |
|     return { interactiveUrl: withdrawal.url, transactionId: withdrawal.id }; |
|   } |
|   |
|   // Step 4: Poll transaction status until complete |
|   async pollStatus(token: string, transactionId: string) { |
|     const anchor \= this.wallet.anchor({ homeDomain: "extstellar.moneygram.com" }); |
|     const sep24  \= await anchor.sep24(); |
|   |
|     // Poll every 5 seconds until terminal state |
|     const result \= await sep24.getTransactionBy({ |
|       authToken: token, |
|       id:        transactionId, |
|     }); |
|   |
|     // Status: pending\_user\_transfer\_start \= ready for user to send USDC |
|     //         completed \= funds received/sent |
|     //         error \= failed |
|     return result; |
|   } |
| } |

*⚠  Apply for MoneyGram's allowlist at developer.moneygram.com before writing this code. Approval can take 1–2 weeks. Start the application on Day 1 of the project.*

**08  ·  CHAIN DETECTION**

# **Address Detection & Chain Routing**

When a merchant pastes a destination address, Useroutr must identify the chain from the address format and route accordingly. For EVM addresses (which look identical across all EVM chains), the merchant must also specify the chain explicitly.

| TypeScript — Address Detection |
| :---- |
| // packages/types/chain.types.ts |
|   |
| export type Chain \= |
|   | "stellar" | "ethereum" | "base" | "bnb" | "polygon" |
|   | "arbitrum" | "avalanche" | "solana" | "starknet"; |
|   |
| export interface AddressDetectionResult { |
|   possibleChains: Chain\[\]; |
|   format:         "evm" | "stellar" | "solana" | "starknet" | "unknown"; |
|   requiresChainSelection: boolean; |
| } |
|   |
| // packages/types/chain-detector.ts |
|   |
| export function detectAddressChain(address: string): AddressDetectionResult { |
|   // EVM: 0x \+ 40 hex chars (all EVM chains share this format) |
|   if (/^0x\[0-9a-fA-F\]{40}$/.test(address)) { |
|     return { |
|       possibleChains: \["ethereum","base","bnb","polygon","arbitrum","avalanche"\], |
|       format: "evm", |
|       requiresChainSelection: true, // Must ask merchant which EVM chain |
|     }; |
|   } |
|   |
|   // Starknet: 0x \+ 63 or 64 hex chars (longer than EVM) |
|   if (/^0x\[0-9a-fA-F\]{63,64}$/.test(address)) { |
|     return { |
|       possibleChains: \["starknet"\], |
|       format: "starknet", |
|       requiresChainSelection: false, |
|     }; |
|   } |
|   |
|   // Stellar: G \+ 55 alphanumeric (base32) |
|   if (/^G\[A-Z2-7\]{55}$/.test(address)) { |
|     return { |
|       possibleChains: \["stellar"\], |
|       format: "stellar", |
|       requiresChainSelection: false, |
|     }; |
|   } |
|   |
|   // Solana: base58, 32–44 chars |
|   if (/^\[1-9A-HJ-NP-Za-km-z\]{32,44}$/.test(address)) { |
|     return { |
|       possibleChains: \["solana"\], |
|       format: "solana", |
|       requiresChainSelection: false, |
|     }; |
|   } |
|   |
|   return { possibleChains: \[\], format: "unknown", requiresChainSelection: true }; |
| } |
|   |
| // Usage in merchant onboarding: |
| // const result \= detectAddressChain("0x742d35Cc..."); |
| // if (result.requiresChainSelection) { |
| //   Show chain selector: \[ETH\] \[Base\] \[BNB\] \[Polygon\] \[Arbitrum\] \[Avalanche\] |
| // } |

**09  ·  ENVIRONMENT CONFIG**

# **Environment Variables**

Never commit secrets to git. All environment variables are injected at runtime. Use .env.example with placeholder values as documentation. Use Railway's environment variable manager in production.

| .env.example |
| :---- |
| \# .env.example — copy to .env and fill in values |
|   |
| \# ── Database ────────────────────────────────────────────────── |
| DATABASE\_URL="postgresql://useroutr:password@localhost:5432/useroutr" |
|   |
| \# ── Redis ───────────────────────────────────────────────────── |
| REDIS\_URL="redis://localhost:6379" |
|   |
| \# ── Auth ────────────────────────────────────────────────────── |
| JWT\_SECRET="your-256-bit-secret-here" |
| JWT\_EXPIRY="7d" |
| API\_KEY\_SALT="your-api-key-salt" |
|   |
| \# ── Stellar ─────────────────────────────────────────────────── |
| STELLAR\_NETWORK="testnet"   \# "mainnet" for production |
| STELLAR\_HORIZON\_URL="https://horizon-testnet.stellar.org" |
| STELLAR\_SOROBAN\_RPC\_URL="https://soroban-testnet.stellar.org" |
| STELLAR\_RELAY\_KEYPAIR\_SECRET="S..."  \# Relay hot wallet (NEVER share) |
| STELLAR\_RELAY\_PUBLIC\_KEY="G..." |
|   |
| \# ── Soroban Contracts ───────────────────────────────────────── |
| SOROBAN\_HTLC\_CONTRACT\_ID="C..." |
| SOROBAN\_SETTLEMENT\_CONTRACT\_ID="C..." |
| SOROBAN\_FEE\_COLLECTOR\_CONTRACT\_ID="C..." |
| SOROBAN\_ESCROW\_CONTRACT\_ID="C..." |
|   |
| \# ── EVM (deploy HTLC on each chain) ─────────────────────────── |
| EVM\_RELAY\_PRIVATE\_KEY="0x..."         \# EVM relay wallet (NEVER share) |
| HTLC\_ADDRESS\_ETHEREUM="0x..." |
| HTLC\_ADDRESS\_BASE="0x..." |
| HTLC\_ADDRESS\_BNB="0x..." |
| HTLC\_ADDRESS\_POLYGON="0x..." |
| HTLC\_ADDRESS\_ARBITRUM="0x..." |
| HTLC\_ADDRESS\_AVALANCHE="0x..." |
|   |
| \# RPC endpoints (use Alchemy / Infura in production) |
| RPC\_ETHEREUM="https://eth-mainnet.g.alchemy.com/v2/YOUR\_KEY" |
| RPC\_BASE="https://base-mainnet.g.alchemy.com/v2/YOUR\_KEY" |
| RPC\_BNB="https://bsc-dataseed.binance.org/" |
| RPC\_POLYGON="https://polygon-rpc.com" |
| RPC\_ARBITRUM="https://arb1.arbitrum.io/rpc" |
| RPC\_AVALANCHE="https://api.avax.network/ext/bc/C/rpc" |
|   |
| \# ── Circle CCTP ─────────────────────────────────────────────── |
| CIRCLE\_API\_KEY="your-circle-api-key" |
|   |
| \# ── Wormhole ────────────────────────────────────────────────── |
| WORMHOLE\_ENV="Testnet"   \# "Mainnet" for production |
|   |
| \# ── Layerswap (Starknet) ────────────────────────────────────── |
| LAYERSWAP\_API\_KEY="your-layerswap-key" |
|   |
| \# ── MoneyGram ───────────────────────────────────────────────── |
| MONEYGRAM\_HOME\_DOMAIN="extstellar.moneygram.com"  \# testnet |
| \# MONEYGRAM\_HOME\_DOMAIN="stellar.moneygram.com"  \# mainnet |
|   |
| \# ── Stripe (card payments) ──────────────────────────────────── |
| STRIPE\_SECRET\_KEY="sk\_test\_..." |
| STRIPE\_WEBHOOK\_SECRET="whsec\_..." |
|   |
| \# ── Email ───────────────────────────────────────────────────── |
| RESEND\_API\_KEY="re\_..." |
| EMAIL\_FROM="payments@tavio.io" |
|   |
| \# ── Storage ─────────────────────────────────────────────────── |
| R2\_ACCOUNT\_ID="your-cloudflare-account-id" |
| R2\_ACCESS\_KEY\_ID="your-r2-access-key" |
| R2\_SECRET\_ACCESS\_KEY="your-r2-secret-key" |
| R2\_BUCKET\_NAME="useroutr-files" |
| R2\_PUBLIC\_URL="https://files.tavio.io" |
|   |
| \# ── App ─────────────────────────────────────────────────────── |
| PORT=3000 |
| NODE\_ENV="development" |
| FRONTEND\_URL="http://localhost:3001" |
| CHECKOUT\_URL="http://localhost:3002" |
| USEROUTR\_FEE\_BPS=50    \# Default 0.5% platform fee |

**10  ·  STEP-BY-STEP BUILD GUIDE**

# **Step-by-Step Build Guide**

20 weeks. One feature fully working end-to-end before the next begins. No parallel tracks. No half-finished modules.

The sequence below is ordered by dependency — each phase depends on the previous one being complete and tested. Do not skip ahead. A payment product with half-working features is worse than no product — it's a product that loses people's money.

## **Phase 1 — Foundation (Weeks 1–2)**

Everything that every other module depends on. Get this working before touching blockchain.

| 1 | Initialize the monorepo bash \# Create workspace mkdir useroutr && cd useroutr npm init \-y   \# Install NestJS CLI globally npm install \-g @nestjs/cli   \# Create NestJS monorepo nest new api \--skip-git cd api && nest generate app dashboard nest generate app checkout nest generate app www   \# Add shared library nest generate library types nest generate library stellar   \# Add workspace packages npm install \-w packages/types typescript zod  |
| :---: | :---- |

| 2 | Start local services with Docker yaml \# docker-compose.yml version: "3.8" services:   postgres:     image: postgres:16-alpine     environment:       POSTGRES\_DB: useroutr       POSTGRES\_USER: useroutr       POSTGRES\_PASSWORD: password     ports: \["5432:5432"\]     volumes: \["pgdata:/var/lib/postgresql/data"\]     redis:     image: redis:7-alpine     ports: \["6379:6379"\]   volumes:   pgdata: bash docker-compose up \-d docker ps  \# Verify both containers running  |
| :---: | :---- |

| 3 | Set up Prisma and run first migration bash npm install prisma @prisma/client npx prisma init \# Copy the full schema from Section 4 into prisma/schema.prisma npx prisma migrate dev \--name init npx prisma generate  |
| :---: | :---- |

| 4 | Build the Auth Module Implement JWT authentication, API key generation (hashed with bcrypt), and the merchant registration/login endpoints. This module is a dependency of every other module. bash nest generate module auth apps/api/src/modules nest generate service auth apps/api/src/modules nest generate controller auth apps/api/src/modules   npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt npm install \-D @types/bcrypt @types/passport-jwt Endpoints to implement: POST /auth/register, POST /auth/login, POST /auth/refresh, GET /auth/me, POST /merchants/api-keys, DELETE /merchants/api-keys/:id |
| :---: | :---- |

| 5 | Set up Redis and BullMQ bash npm install @nestjs-modules/ioredis ioredis bullmq @nestjs/bullmq   \# Add to app.module.ts: \# RedisModule.forRoot({ config: { url: process.env.REDIS\_URL } }) \# BullModule.forRoot({ connection: { url: process.env.REDIS\_URL } })  |
| :---: | :---- |

| 6 | Add WebSocket Gateway for real-time updates bash npm install @nestjs/websockets @nestjs/platform-socket.io socket.io nest generate gateway events apps/api/src/modules/events \# Implement payment:status event emission \# Dashboard subscribes to payment:{id}:status channel  |
| :---: | :---- |

## **Phase 2 — Stellar Core (Weeks 3–4)**

Build the Stellar module. This is the heart of Useroutr. Everything routes through Stellar.

| 7 | Install Stellar SDKs and create the Stellar Module bash npm install @stellar/stellar-sdk @stellar/typescript-wallet-sdk   nest generate module stellar apps/api/src/modules nest generate service stellar apps/api/src/modules   \# Implement in stellar.service.ts: \# \- createAccount() \# \- getAccount(publicKey) \# \- findStrictSendPaths(sourceAsset, amount, destAsset) \# \- findStrictReceivePaths(destAsset, amount, sourceAsset) \# \- executePathPayment(params) \# \- streamContractEvents(contractId, callback) \# \- fundTestnetAccount(publicKey)  \-- testnet only  |
| :---: | :---- |

| 8 | Build and deploy the Soroban HTLC Contract bash \# Install Rust and Stellar CLI curl \--proto "=https" \--tlsv1.2 \-sSf https://sh.rustup.rs | sh rustup target add wasm32-unknown-unknown cargo install \--locked stellar-cli \--features opt   \# Create HTLC contract cd contracts/soroban stellar contract init htlc   \# Copy HTLC contract code from Section 5 into htlc/src/lib.rs   \# Build cd htlc && cargo build \--target wasm32-unknown-unknown \--release   \# Run tests cargo test   \# Deploy to testnet stellar contract deploy \\   \--wasm target/wasm32-unknown-unknown/release/htlc.wasm \\   \--source YOUR\_KEYPAIR \\   \--network testnet   \# Save the contract ID to your .env as SOROBAN\_HTLC\_CONTRACT\_ID  |
| :---: | :---- |

| 9 | Build and deploy the Fee Collector Contract bash cd contracts/soroban stellar contract init fee-collector \# Copy fee-collector code from Section 5 cargo build \--target wasm32-unknown-unknown \--release cargo test   \# Deploy to testnet stellar contract deploy \\   \--wasm target/wasm32-unknown-unknown/release/fee\_collector.wasm \\   \--source YOUR\_KEYPAIR \\   \--network testnet   \# Initialize the contract stellar contract invoke \\   \--id YOUR\_FEE\_COLLECTOR\_ID \\   \--source YOUR\_KEYPAIR \\   \--network testnet \\   \-- initialize \\   \--admin YOUR\_PUBLIC\_KEY \\   \--fee\_bps 50 \\   \--treasury YOUR\_TREASURY\_ADDRESS  |
| :---: | :---- |

## **Phase 3 — Quote & Payment Core (Weeks 5–6)**

| 10 | Build the Quote Service Implement the Quote Service as defined in Section 6.3. Wire it to the Stellar path payment finder. Test that quotes are locked in Redis and expire correctly after 30 seconds. bash \# Test quote creation via curl curl \-X POST http://localhost:3000/v1/quotes \\   \-H "Authorization: Bearer YOUR\_JWT" \\   \-H "Content-Type: application/json" \\   \-d '{"fromChain":"ethereum","fromAsset":"USDC","fromAmount":"100","toChain":"stellar","toAsset":"USDC"}'   \# Verify Redis TTL redis-cli TTL quote:YOUR\_QUOTE\_ID  \# Should return \~30  |
| :---: | :---- |

| 11 | Build the Payment Service — lifecycle Create payment → validate quote → create HTLC lock on Stellar → update status → emit webhook. This is the core business logic. Test every status transition. bash \# Status transitions to test: \# PENDING → QUOTE\_LOCKED → SOURCE\_LOCKED → STELLAR\_LOCKED \# → PROCESSING → COMPLETED \# → REFUNDING → REFUNDED (timeout path) \# → FAILED (error path)   \# Each transition must: \# 1\. Update DB \# 2\. Emit WebSocket event to dashboard \# 3\. Queue webhook delivery via BullMQ  |
| :---: | :---- |

## **Phase 4 — Relay & HTLC Watcher (Weeks 7–8)**

| 12 | Build the Relay Service Implement the Relay Service from Section 6.2. This is the most complex NestJS module. It must be fault-tolerant — if it crashes and restarts, it must re-process any events it missed. bash \# Key things to test: \# 1\. Lock a HTLC manually on Stellar testnet \# 2\. Call withdraw() with correct preimage \# 3\. Verify relay detects the "withdrawn" event \# 4\. Verify relay propagates preimage to source chain   \# Test the refund watchdog: \# 1\. Create a HTLC with a 10-second timelock (testnet only) \# 2\. Wait 10 seconds \# 3\. Verify watchdog triggers refund automatically  |
| :---: | :---- |

| 13 | Deploy and test EVM HTLC contracts bash cd contracts/evm npm install npm install \--save-dev hardhat @nomicfoundation/hardhat-toolbox npm install @openzeppelin/contracts   \# Copy HTLCEvm.sol from Section 5   \# Test locally npx hardhat test   \# Deploy to Base Sepolia testnet npx hardhat run scripts/deploy.ts \--network base-sepolia   \# Deploy to other testnets npx hardhat run scripts/deploy.ts \--network sepolia npx hardhat run scripts/deploy.ts \--network bnb-testnet npx hardhat run scripts/deploy.ts \--network polygon-mumbai   \# Save all contract addresses to .env  |
| :---: | :---- |

## **Phase 5 — Bridge Integrations (Weeks 9–11)**

| 14 | Integrate Circle CCTP CCTP enables native USDC transfers between Ethereum, Base, Avalanche, Arbitrum, Polygon, and Stellar. This covers your highest-volume routes. bash npm install @circle-fin/w3s-pw-web-sdk \# Also install Circle's attestation API client   \# CCTP flow: \# 1\. User approves USDC burn on source chain \# 2\. Circle burns USDC and issues attestation \# 3\. Useroutr polls Circle Attestation API for confirmation \# 4\. Useroutr submits attestation to Stellar CCTP receiver \# 5\. USDC minted on Stellar   \# Test on testnets first: \# Sepolia → Base Sepolia → Stellar Testnet  |
| :---: | :---- |

| 15 | Integrate Wormhole Wormhole covers BNB Chain, Solana, and any asset that CCTP does not support natively. bash npm install @wormhole-foundation/sdk   \# Wormhole flow: \# 1\. Lock asset in Wormhole contract on source chain \# 2\. Wormhole guardian network signs a VAA (Verified Action Approval) \# 3\. Relay service polls for VAA availability \# 4\. Relay submits VAA to Stellar Wormhole receiver \# 5\. Wrapped asset available on Stellar \# 6\. Stellar path payment converts wrapped asset → USDC  |
| :---: | :---- |

| 16 | Integrate Layerswap (Starknet) bash \# Layerswap is REST API based — no SDK needed \# Sign up at layerswap.io and get API key   \# POST https://api.layerswap.io/api/swaps \# { source\_network: "STELLAR", dest\_network: "STARKNET", \#   source\_asset: "USDC", dest\_asset: "USDC", amount: ... }   \# Layerswap handles the bridging and delivers to Starknet address  |
| :---: | :---- |

## **Phase 6 — MoneyGram Fiat Ramp (Week 12\)**

| 17 | Integrate MoneyGram SEP-24 Apply for allowlist access FIRST (developer.moneygram.com) — this needs to happen on Day 1 of the project, not week 12\. Assuming allowlist approval, integration takes about one week. bash \# Already installed: @stellar/typescript-wallet-sdk   \# Implementation is in Section 7 of this document   \# Test checklist: \# 1\. SEP-10 authentication works (get JWT token) \# 2\. Initiate on-ramp — get interactive URL \# 3\. Open URL in browser — complete test transaction \# 4\. Poll status — verify "completed" \# 5\. Check testnet Stellar account received USDC \# 6\. Initiate off-ramp — get interactive URL \# 7\. Complete test withdrawal  |
| :---: | :---- |

## **Phase 7 — Merchant Tools (Weeks 13–14)**

| 18 | Build Payment Links module Generate short shareable URLs that point to the hosted checkout. When a link is opened, the checkout pre-fills with the configured amount, currency, and description. bash \# Endpoints: \# POST   /v1/payment-links \# GET    /v1/payment-links \# GET    /v1/payment-links/:id \# DELETE /v1/payment-links/:id \# GET    /pay/:linkId  (public — hosted checkout)   \# Link format: https://pay.tavio.io/l/ABC123  |
| :---: | :---- |

| 19 | Build Invoicing module bash npm install puppeteer  \# or @react-pdf/renderer   \# Endpoints: \# POST   /v1/invoices \# GET    /v1/invoices \# GET    /v1/invoices/:id \# POST   /v1/invoices/:id/send \# POST   /v1/invoices/:id/mark-paid   \# PDF generation: \# Render invoice HTML template with Puppeteer \# Upload PDF to Cloudflare R2 \# Store R2 URL in invoice.pdfUrl \# Send PDF link via Resend email  |
| :---: | :---- |

| 20 | Build Payouts module bash \# Endpoints: \# POST  /v1/payouts          (single) \# POST  /v1/payouts/bulk     (CSV upload or JSON array) \# GET   /v1/payouts \# GET   /v1/payouts/:id   \# Payout routing: \# STELLAR destination  → direct Stellar transfer \# CRYPTO destination   → bridge via BridgeRouter \# BANK/MOBILE\_MONEY    → MoneyGram SEP-24 off-ramp   \# Bulk payouts via BullMQ: \# Each recipient \= one BullMQ job \# Jobs run with concurrency: 5 \# Failed jobs retry 3x with exponential backoff  |
| :---: | :---- |

## **Phase 8 — Frontends (Weeks 15–16)**

| 21 | Build the Hosted Checkout (Next.js) Mobile-first. Consumer-facing. This is what makes or breaks conversion. Three paths: Card (Stripe Elements), Bank Transfer (instructions display), Crypto (wallet connect \+ HTLC flow). bash npm install wagmi viem @rainbow-me/rainbowkit  \# EVM wallet connect npm install @solana/wallet-adapter-react        \# Solana wallet connect npm install @stripe/react-stripe-js @stripe/stripe-js  \# Card payments   \# Routes in checkout app: \# /\[paymentId\]          — order summary \+ method selection \# /\[paymentId\]/card     — Stripe Elements card form \# /\[paymentId\]/bank     — bank transfer instructions \# /\[paymentId\]/crypto   — wallet connect \+ HTLC approval \# /\[paymentId\]/confirm  — awaiting confirmation screen \# /\[paymentId\]/success  — payment complete \# /\[paymentId\]/expired  — quote or session expired   \# /l/\[linkId\]           — payment link landing page  |
| :---: | :---- |

| 22 | Build the Merchant Dashboard (Next.js) Desktop-first. All sections from the design brief. Wire to the API via React Query. Implement WebSocket connection for real-time payment status updates. bash \# Install shared UI npm install @radix-ui/react-\* tailwindcss class-variance-authority   \# Core pages: \# /dashboard           — overview \+ metrics \# /dashboard/payments  — transaction list \# /dashboard/links     — payment links \# /dashboard/invoices  — invoicing \# /dashboard/payouts   — payouts \# /dashboard/analytics — charts \# /dashboard/settings  — API keys, webhooks, team  |
| :---: | :---- |

## **Phase 9 — Hardening (Weeks 17–18)**

| 23 | Security & Production readiness Do not skip this phase. These are not nice-to-haves — they are table stakes for a payment product. Rate limiting: 100 req/min per API key on all endpoints. 10 req/min on auth endpoints. Idempotency keys: All POST endpoints accept Idempotency-Key header. Duplicate requests return the same response. Webhook signature verification: HMAC-SHA256. Document the verification process for merchants. Input sanitization: All inputs validated with Zod. No raw user data in SQL queries (Prisma parameterizes automatically). Secrets audit: Verify no secrets in git history. Rotate all keys. Move to Railway env vars. Sentry integration: Error tracking on both API and frontend. Set up alerts for payment failures. Smart contract audit: Engage OtterSec, Halborn, or Trail of Bits. Budget $15k–$40k. Non-negotiable before mainnet. |
| :---: | :---- |

| 24 | Deploy to Railway (Staging) bash \# Railway CLI npm install \-g @railway/cli railway login railway new   \# Add services railway add \--plugin postgresql railway add \--plugin redis   \# Deploy API railway up   \# Add all environment variables via Railway dashboard \# Set up custom domains: \#   api.tavio.io      → Railway API service \#   dashboard.tavio.io → Railway dashboard service \#   checkout.tavio.io  → Railway checkout service   \# Set up Cloudflare as proxy in front of all domains  |
| :---: | :---- |

## **Phase 10 — Launch (Weeks 19–20)**

| 25 | Testnet end-to-end test across all chains Before touching mainnet, run the complete payment flow on every supported chain combination. Create a test matrix and tick every cell. Flow Test Result Stellar → Stellar (native) ETH (Sepolia) → Stellar Base (Sepolia) → Stellar BNB testnet → Stellar Solana devnet → Stellar Starknet testnet → Stellar Stellar → ETH (Sepolia) Stellar → Base (Sepolia) MoneyGram on-ramp (sandbox) MoneyGram off-ramp (sandbox) Quote expiry → refund flow HTLC timeout → auto refund Webhook delivery \+ retry Bulk payout (10 recipients)  |
| :---: | :---- |

| 26 | Mainnet deployment with low limits Deploy contracts to mainnet. Start with hard limits to contain risk while you build confidence. Transaction limit: $100 maximum per payment for first 30 days. Daily volume limit: $1,000 total platform volume for first 30 days. Merchant whitelist: First 10 merchants are hand-onboarded. No self-serve signup yet. 24/7 monitoring: Set up PagerDuty or similar. You need to know the moment a payment gets stuck. Incident runbook: Document exactly what to do if: relay goes down, HTLC gets stuck, bridge delays, Stellar network issues. |
| :---: | :---- |

**11  ·  TESTING**

# **Testing Strategy**

Payment infrastructure requires a higher testing bar than a typical SaaS. A bug in a CRUD app loses data. A bug in a payment contract loses money.

## **Smart Contract Tests (Rust)**

| Rust — HTLC Tests |
| :---- |
| // contracts/soroban/htlc/src/test.rs |
|   |
| \#\[cfg(test)\] |
| mod tests { |
|     use super::\*; |
|     use soroban\_sdk::{testutils::{Address as \_, Ledger}, Env}; |
|   |
|     fn setup() \-\> (Env, Address, Address, Address) { |
|         let env \= Env::default(); |
|         env.mock\_all\_auths(); |
|         let sender   \= Address::generate(\&env); |
|         let receiver \= Address::generate(\&env); |
|         let token    \= env.register\_stellar\_asset\_contract\_v2(sender.clone()); |
|         (env, sender, receiver, token.address()) |
|     } |
|   |
|     \#\[test\] |
|     fn test\_lock\_and\_withdraw() { |
|         let (env, sender, receiver, token) \= setup(); |
|         let client \= HTLCContractClient::new(\&env, \&env.register(HTLCContract, ())); |
|   |
|         let secret   \= Bytes::from\_slice(\&env, b"supersecret"); |
|         let hashlock \= env.crypto().sha256(\&secret); |
|         let timelock \= env.ledger().timestamp() \+ 3600; |
|   |
|         let lock\_id \= client.lock(\&sender, \&receiver, \&token, &1000, \&hashlock, \&timelock); |
|         assert\!(client.withdraw(\&lock\_id, \&secret)); |
|   |
|         let entry \= client.get\_lock(\&lock\_id); |
|         assert\!(entry.withdrawn); |
|     } |
|   |
|     \#\[test\] |
|     fn test\_refund\_after\_expiry() { |
|         let (env, sender, receiver, token) \= setup(); |
|         let client \= HTLCContractClient::new(\&env, \&env.register(HTLCContract, ())); |
|   |
|         let secret   \= Bytes::from\_slice(\&env, b"supersecret"); |
|         let hashlock \= env.crypto().sha256(\&secret); |
|         let timelock \= env.ledger().timestamp() \+ 100; |
|   |
|         let lock\_id \= client.lock(\&sender, \&receiver, \&token, &1000, \&hashlock, \&timelock); |
|   |
|         // Fast-forward past expiry |
|         env.ledger().set\_timestamp(timelock \+ 1); |
|         assert\!(client.refund(\&lock\_id)); |
|   |
|         let entry \= client.get\_lock(\&lock\_id); |
|         assert\!(entry.refunded); |
|     } |
|   |
|     \#\[test\] |
|     \#\[should\_panic(expected \= "InvalidPreimage")\] |
|     fn test\_reject\_wrong\_preimage() { |
|         let (env, sender, receiver, token) \= setup(); |
|         let client \= HTLCContractClient::new(\&env, \&env.register(HTLCContract, ())); |
|   |
|         let secret   \= Bytes::from\_slice(\&env, b"correctsecret"); |
|         let wrong    \= Bytes::from\_slice(\&env, b"wrongsecret"); |
|         let hashlock \= env.crypto().sha256(\&secret); |
|         let timelock \= env.ledger().timestamp() \+ 3600; |
|   |
|         let lock\_id \= client.lock(\&sender, \&receiver, \&token, &1000, \&hashlock, \&timelock); |
|         client.withdraw(\&lock\_id, \&wrong); // Should panic |
|     } |
| } |

## **NestJS Unit & Integration Tests**

| Module | What to Test |
| :---- | :---- |
| Auth | JWT generation, API key hashing, guard rejection of invalid tokens |
| Quotes | Path finding returns valid paths, Redis TTL is set, expired quotes are rejected |
| Payments | All status transitions, webhook queue is populated, idempotency keys work |
| Relay | Stellar event detection, preimage propagation, expired lock watchdog |
| Bridge Router | Correct provider selected per chain pair, error handling when bridge fails |
| MoneyGram | SEP-10 auth flow, SEP-24 initiation, status polling |
| Webhooks | BullMQ job creation, delivery retry logic, signature generation |

**12  ·  QUICK REFERENCE**

# **Quick Reference**

## **Key External URLs**

| Resource | URL |
| :---- | :---- |
| Stellar Docs | developers.stellar.org |
| Soroban Docs | developers.stellar.org/docs/smart-contracts |
| Stellar Testnet Faucet | friendbot.stellar.org |
| Circle CCTP Docs | developers.circle.com/stablecoins/cctp |
| Wormhole Docs | docs.wormhole.com |
| Layerswap API | docs.layerswap.io |
| MoneyGram Dev Portal | developer.moneygram.com |
| Railway Docs | docs.railway.app |
| Stellar Lab (testnet tools) | lab.stellar.org |
| Soroban Examples | github.com/stellar/soroban-examples |
| Phosphor Icons | phosphoricons.com |
| NestJS Docs | docs.nestjs.com |

## **Command Cheat Sheet**

| bash |
| :---- |
| \# ── Local Dev ──────────────────────────────────────────────── |
| docker-compose up \-d                    \# Start Postgres \+ Redis |
| npx prisma studio                       \# Visual DB browser |
| npx prisma migrate dev                  \# Apply new migrations |
| npx prisma db seed                      \# Seed test data |
| npm run start:dev                       \# Run NestJS in watch mode |
|   |
| \# ── Soroban ────────────────────────────────────────────────── |
| cargo build \--target wasm32-unknown-unknown \--release |
| cargo test |
| stellar contract deploy \--wasm \*.wasm \--source KEY \--network testnet |
| stellar contract invoke \--id CONTRACT\_ID \--network testnet \-- FUNCTION \--arg VALUE |
| stellar contract events \--id CONTRACT\_ID \--network testnet |
|   |
| \# ── EVM Contracts ──────────────────────────────────────────── |
| npx hardhat compile |
| npx hardhat test |
| npx hardhat run scripts/deploy.ts \--network base-sepolia |
| npx hardhat verify \--network base-sepolia CONTRACT\_ADDRESS |
|   |
| \# ── Railway ────────────────────────────────────────────────── |
| railway up                              \# Deploy current code |
| railway logs                            \# Stream production logs |
| railway variables                       \# Show env vars |
| railway run npm run migrate:prod        \# Run migrations in prod |

## **Testnet Resources**

| Network | Faucet / Testnet Info |
| :---- | :---- |
| Stellar Testnet | friendbot.stellar.org/?addr=YOUR\_KEY |
| USDC on Stellar Testnet | Circle Faucet: faucet.circle.com |
| Base Sepolia | bridge.base.org/deposit (testnets.base.org) |
| Ethereum Sepolia | sepoliafaucet.com |
| BNB Testnet | testnet.bnbchain.org/faucet-smart |
| Polygon Amoy | faucet.polygon.technology |
| Solana Devnet | solfaucet.com |

| Build it like it's infrastructure. *Pay anything. Settle everywhere.* tavio.io  ·  docs.tavio.io  ·  A product of thirtn.com |
| :---: |

