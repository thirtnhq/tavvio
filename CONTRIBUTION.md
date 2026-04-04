# Contributing to Useroutr

Thanks for contributing to Useroutr. This document defines the expected workflow, quality bar, and review checklist for all changes.

## Scope and Principles

Useroutr is payment infrastructure. Favor correctness and safety over speed:

- Keep changes small and focused.
- Preserve non-custodial and atomic-settlement assumptions.
- Do not ship incomplete money-flow logic behind unclear behavior.
- Avoid unrelated refactors in the same PR.

## Repository Areas

- `apps/api` — NestJS backend modules (auth, quotes, payments, relay, bridge, etc.)
- `packages/types` — shared types/schemas used across services
- `packages/stellar` — Stellar client wrappers
- `contract/soroban` — Rust Soroban contracts
- `contract/evm` — Solidity HTLC contracts and Hardhat config
- `contract/starknet` — Cairo HTLC contract

## Local Setup

1. Install dependencies from repo root:

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Start local infrastructure:

```bash
docker compose up -d
```

4. Update `.env` DB URL for local Docker mapping (`5434`):

```env
DATABASE_URL="postgresql://useroutr:password@localhost:5434/useroutr"
```

5. Run Prisma migration/generate from `apps/api`:

```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

6. Start API dev server:

```bash
npm run start:dev
```

## Branch and PR Workflow

- Create a feature branch from `main`.
- Use clear branch names:
  - `feat/<short-description>`
  - `fix/<short-description>`
  - `chore/<short-description>`
- Open one PR per logical change.
- Include implementation notes + test evidence in PR description.

## Commit Guidelines

Use clear, imperative commit messages:

- `feat(quotes): add redis quote lock validation`
- `fix(relay): handle missing stellar lock id`
- `test(payments): cover completed -> refunded timeout path`

Keep commits atomic; avoid mixing generated noise with logic changes where possible.

## Coding Standards

### TypeScript / NestJS

- Follow existing module boundaries.
- Validate input at API boundaries.
- Keep business logic in services; controllers should stay thin.
- Reuse shared types from `packages/types` when possible.
- Do not hardcode secrets or chain credentials.

### Smart Contracts

- Treat any contract change as high-risk.
- Add or update tests for all state transition changes.
- Document security assumptions and timeout semantics in PR.
- Never remove safety checks (timelock, hashlock, authorization) without explicit design approval.

## Testing Requirements

Before opening a PR, run relevant tests for touched areas.

### API (from `apps/api`)

```bash
npm run test
npm run test:e2e
npm run build
```

### Soroban (from `contract/soroban`)

```bash
cargo test
```

### EVM (from `contract/evm`)

```bash
npm install
npx hardhat test
```

If a test is skipped, explain why in the PR description.

## Database and Migrations

- Schema changes must include a Prisma migration.
- Keep migration names descriptive.
- Avoid force-resetting shared databases.
- Verify backward compatibility for active data paths.

## Security and Secrets

- Never commit `.env` or secrets.
- Rotate any key accidentally exposed in logs/screenshots.
- Avoid logging secrets, preimages, private keys, or sensitive auth headers.
- For payment/relay logic changes, include failure-mode handling (timeout, retries, idempotency) in PR notes.

## PR Checklist

- [ ] Change is scoped to one concern
- [ ] Relevant tests pass locally
- [ ] No secrets committed
- [ ] Migrations included (if schema changed)
- [ ] Docs updated (if behavior/setup changed)
- [ ] Risk and rollback notes included for payment/contract changes

## Reporting Issues

When filing a bug, include:

- Environment (`local`, `staging`, `testnet`)
- Expected behavior vs actual behavior
- Steps to reproduce
- Logs/error output (redacted)
- Related chain/asset/payment status if applicable

## Questions

If requirements are unclear, open a draft PR early with assumptions listed. It is better to align early than rework critical payment logic late.