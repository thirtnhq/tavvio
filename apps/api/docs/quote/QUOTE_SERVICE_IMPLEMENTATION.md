# Quote Service Implementation Summary

## Overview
The Quote Service has been fully implemented with path finding, rate locking, and 30-second TTL functionality. This is the first step of every payment flow - the payer needs to know what they'll pay and the merchant needs to know what they'll receive.

## Components Implemented

### 1. Quote Service (`quotes.service.ts`)
**Core Methods:**
- `createQuote(dto: CreateQuoteDto, merchantId: string): Promise<QuoteResponseDto>`
  - Fetches merchant configuration (feeBps, settlementChain, settlementAsset)
  - Applies defaults if toChain/toAsset not provided
  - Performs path finding via Stellar for same-chain conversions
  - Calculates merchant fee: `(destAmount * merchant.feeBps) / 10000`
  - Calculates net amount: `destAmount - fee`
  - Determines bridge route via BridgeRouter
  - Persists quote to database with 30-second TTL
  - Locks quote in Redis with 30-second expiry
  - Returns full quote response with expiration info

- `validateAndConsume(quoteId: string): Promise<Quote>`
  - Validates quote is not expired (checks expiry datetime)
  - Validates quote has not been consumed (used = false)
  - Marks quote as used in database
  - Deletes Redis lock key
  - Throwing appropriate exceptions on validation failure

- `getQuote(quoteId: string): Promise<Quote | null>`
  - Retrieves quote details for display
  - Returns null if quote not found

**Path Finding Logic:**
- **Same chain & asset**: Returns 1:1 rate, applies merchant fee only
- **Stellar-to-Stellar**: Uses `StellarService.findStrictSendPaths()` to find liquidity
- **Cross-chain**: Uses simplified 1:1 rate (production would integrate price oracles)

### 2. Stellar Service Extension (`stellar.service.ts`)
**New Method:**
- `findStrictSendPaths(params): Promise<StrictSendPathResult>`
  - Connects to Stellar RPC (testnet or mainnet based on env)
  - Finds all available paths for a strict send operation
  - Returns paths sorted by destination amount (highest first)
  - Throws `BadRequestException` if no liquidity found
  - Parses asset strings: "native" or "CODE:issuer"

### 3. Quote Controller (`quotes.controller.ts`)
**Endpoints:**

```
POST /v1/quotes
- Auth: API Key (CombinedAuthGuard)
- Body: CreateQuoteDto
- Returns: QuoteResponseDto (201 Created)
- Validates input automatically via ValidationPipe

GET /v1/quotes/:id
- Auth: API Key (CombinedAuthGuard)
- Returns: QuoteResponseDto (200 OK) or null (404)
- Calculates bridge route info at response time
```

### 4. DTOs

**CreateQuoteDto:**
```typescript
{
  fromChain: Chain,           // Required
  fromAsset: string,          // Required
  fromAmount: string,         // Required (decimal string)
  toChain?: Chain,           // Optional (defaults to merchant.settlementChain)
  toAsset?: string,          // Optional (defaults to merchant.settlementAsset)
}
```

**QuoteResponseDto:**
```typescript
{
  id: string,
  fromChain: string,
  fromAsset: string,
  fromAmount: string,
  toChain: string,
  toAsset: string,
  toAmount: string,           // Net amount merchant receives (after fees)
  rate: string,
  fee: string,                // Fee amount
  feeBps: number,
  bridgeProvider: string | null,  // "cctp" | "wormhole" | "layerswap" | null
  estimatedTimeMs: number,
  expiresAt: string,          // ISO 8601 timestamp
  expiresInSeconds: number,   // Convenience field for frontend
}
```

## Database Schema
Quote model fields:
```prisma
id          String   @id @default(cuid())
fromChain   String
fromAsset   String
fromAmount  Decimal  @db.Decimal(36, 18)
toChain     String
toAsset     String
toAmount    Decimal  @db.Decimal(36, 18)  // Net amount after fees
rate        Decimal  @db.Decimal(36, 18)
feeBps      Int
feeAmount   Decimal  @db.Decimal(36, 18)
stellarPath Json?                         // Stellar path hop details
bridgeRoute String?                       // Provider name
expiresAt   DateTime                      // lockedAt + 30s
used        Boolean  @default(false)
```

## Redis Schema
```
quote:{quoteId}
  - TTL: 30 seconds
  - Value: { locked: true, createdAt: timestamp }
  - Keys are automatically deleted when:
    1. 30 seconds elapse (Redis TTL)
    2. Quote is consumed (validateAndConsume deletes explicitly)
```

## Fee Calculation
```
Fee = (destinationAmount * merchant.feeBps) / 10000
Net Amount = destinationAmount - Fee

Example: $100 payment with 50 bps (0.5%) fee:
  Merchant receives: $100 - $0.50 = $99.50
```

## Bridge Route Determination
The `BridgeRouterService` selects the optimal bridge based on chains and asset:

| From | To | Asset | Provider | Time |
|------|----|----|----------|------|
| stellar | stellar | any | NATIVE | 5s |
| * | starknet OR starknet | * | LAYERSWAP | 120s |
| CCTP chains | CCTP chains | USDC | CCTP | 30s |
| * | * | * | WORMHOLE | 60s (default) |

## Error Handling

### 422 Insufficient Liquidity
```json
{
  "statusCode": 422,
  "message": "No liquidity found for {amount} {asset}",
  "error": "Unprocessable Entity"
}
```

### 409 Quote Expired
```json
{
  "statusCode": 409,
  "message": "Quote has expired",
  "error": "Conflict"
}
```

### 409 Quote Already Consumed
```json
{
  "statusCode": 409,
  "message": "Quote has already been used",
  "error": "Conflict"
}
```

### 404 Merchant Not Found
```json
{
  "statusCode": 404,
  "message": "Merchant not found",
  "error": "Not Found"
}
```

### 400 Bad Gateway (Invalid Amount)
```json
{
  "statusCode": 400,
  "message": "fromAmount must be a positive number",
  "error": "Bad Request"
}
```

## Acceptance Criteria Checklist
- [x] POST /v1/quotes returns a quote with rate, fee, and 30s TTL
- [x] Quote is locked in Redis with 30s expiry
- [x] validateAndConsume() succeeds within 30s, fails after
- [x] Consumed quotes cannot be consumed again
- [x] Fee calculation uses merchant's feeBps from DB
- [x] Bridge route and estimated time are included in response
- [x] Missing liquidity returns 422 with clear error message
- [x] Quote expires if not consumed within 30 seconds
- [x] Same-chain same-asset quotes use 1:1 rate
- [x] Cross-chain routing is determined by BridgeRouter

## Testing Coverage
Comprehensive unit tests implemented in `quotes.service.spec.ts`:
- Quote creation with cross-chain routing
- Default application from merchant settings
- Invalid amount rejection
- Merchant not found handling
- Quote validation and consumption
- Quote expiration detection
- Already-consumed quote rejection
- Quote retrieval

## Integration Points
- **PrismaService**: Database operations (create, update, findUnique)
- **StellarService**: Path finding for Stellar conversions
- **BridgeRouterService**: Route selection and estimated time lookup
- **Redis**: High-speed quote locking and TTL management
- **MerchantService**: Merchant configuration lookup (via Prisma)
- **CombinedAuthGuard**: API key authentication

## Future Enhancements
1. Store `estimatedTimeMs` in Quote model to avoid recalculation
2. Add price oracle integration for cross-chain rate quotes
3. Implement quote caching for identical requests
4. Add metrics/analytics tracking for quote creation and consumption
5. Support for multi-hop path finding with slippage protection
