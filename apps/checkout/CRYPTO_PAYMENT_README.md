# Crypto Payment Flow Implementation

This document describes the implementation of the crypto payment flow for Useroutr checkout, including wallet connection and HTLC (Hash Time-Locked Contract) functionality.

## Overview

The crypto payment flow allows users to pay merchants using cryptocurrency across multiple EVM chains. The implementation includes:

- **Chain Selection**: Support for Ethereum, Base, BNB Chain, Polygon, Arbitrum, and Avalanche
- **Token Selection**: Support for USDC, USDT, and native tokens (ETH, BNB, AVAX)
- **Quote Management**: Real-time pricing with 30-second expiration
- **Wallet Integration**: RainbowKit with MetaMask, Coinbase Wallet, and WalletConnect support
- **HTLC Transactions**: Secure escrow-based payment settlement

## File Structure

```
apps/checkout/
├── app/[paymentId]/crypto/page.tsx          # Main crypto payment page
├── components/
│   ├── CryptoPayment.tsx                    # Main crypto payment component
│   └── QuoteCountdown.tsx                   # Quote expiration countdown
├── providers/
│   └── WalletProviders.tsx                  # Wallet connection setup
├── hooks/
│   └── useQuote.ts                          # Quote fetching hook
└── lib/
    └── api.ts                               # API client
```

## Features Implemented

### 1. Chain & Token Selection

- **Supported Chains**: Ethereum, Base, BNB Chain, Polygon, Arbitrum, Avalanche
- **Supported Tokens**: USDC, USDT, ETH, BNB, AVAX
- **Dynamic Token Display**: Tokens update based on selected chain
- **Chain Switching**: Automatic wallet chain switching prompts

### 2. Quote Flow

- **Real-time Pricing**: Fetches quotes from `/v1/quotes` API
- **30-second Expiration**: Automatic countdown with color transitions
- **Auto-refresh**: Quotes refresh before expiration
- **Error Handling**: Graceful handling of quote failures

### 3. Wallet Connection

- **RainbowKit Integration**: Modern wallet connection UI
- **Multiple Wallets**: MetaMask, Coinbase Wallet, WalletConnect, Rabby
- **Network Validation**: Automatic chain switching when needed
- **Balance Checking**: Real-time balance verification

### 4. HTLC Lock Transaction

- **Two-step Process**: Token approval + HTLC lock
- **Cross-chain Settlement**: Prepares for Stellar integration
- **Transaction Monitoring**: Tracks approval and lock transactions
- **API Integration**: Reports lock details to `/v1/payments/:id/source-lock`

### 5. Edge Cases Handled

- **Wallet Not Installed**: Clear installation prompts
- **Wrong Network**: Automatic chain switching
- **Insufficient Balance**: Disabled actions with clear messaging
- **Quote Expired**: Auto-refresh with user notification
- **Transaction Rejected**: Error handling and retry options
- **Network Congestion**: Gas price warnings

## Component Architecture

### CryptoPayment Component

```typescript
interface CryptoPaymentProps {
  paymentId: string;
  merchantAmount: number;
  merchantCurrency: string;
}
```

**Key Features:**

- Chain and token selection UI
- Quote display with conversion rates
- Wallet connection status
- HTLC transaction flow
- Error state management

### QuoteCountdown Component

```typescript
interface QuoteCountdownProps {
  expiresAt?: string;
  onExpired?: () => void;
}
```

**Key Features:**

- 30-second countdown timer
- Color transitions (green → orange → red)
- Auto-expiration handling
- Callback for refresh triggers

## API Integration

### Quote API

```http
POST /v1/quotes
{
  "fromChain": "base",
  "fromAsset": "ETH",
  "fromAmount": "auto",
  "toAsset": "USDC"
}
```

### Source Lock API

```http
POST /v1/payments/:id/source-lock
{
  "sourceTxHash": "0x...",
  "sourceLockId": "0x...",
  "sourceAddress": "0x..."
}
```

## HTLC Contract Integration

The implementation prepares for HTLC contract interaction:

```solidity
// ERC-20 Approval
approve(spender, amount)

// HTLC Lock
lock(receiver, token, amount, hashlock, timelock)
```

**Parameters:**

- `receiver`: Useroutr relay address
- `token`: Token address (0x0 for native tokens)
- `amount`: Amount to lock
- `hashlock`: Hash of preimage for cross-chain settlement
- `timelock`: 24-hour timeout for safety

## Testing

### Unit Tests

Located in `__tests__/crypto-payment.test.tsx`:

```bash
npm test
```

**Test Coverage:**

- Component rendering
- Chain/token selection
- Wallet connection states
- Quote countdown functionality
- Error state handling

### Manual Testing

1. **Start Development Server**:

   ```bash
   cd apps/checkout
   npm run dev
   ```

2. **Test Scenarios**:
   - Chain switching between different networks
   - Token selection for each chain
   - Wallet connection and disconnection
   - Quote expiration and refresh
   - Insufficient balance scenarios
   - Network switching prompts

## Mobile Support

The implementation includes responsive design:

- **375px Support**: Tested at minimum mobile width
- **Touch-friendly**: Large tap targets for mobile
- **Responsive Grids**: Adapts to different screen sizes
- **Mobile Wallets**: Supports mobile wallet connections

## Security Considerations

1. **Transaction Safety**: Proper approval patterns for ERC-20 tokens
2. **Timeout Protection**: 24-hour timelock for HTLC contracts
3. **Address Validation**: Input validation for wallet addresses
4. **Error Handling**: Graceful degradation on failures
5. **Network Verification**: Chain validation before transactions

## Future Enhancements

1. **Solana Support**: Add Solana wallet integration
2. **Stellar Integration**: Complete cross-chain settlement
3. **Advanced Analytics**: Transaction monitoring and reporting
4. **Batch Operations**: Multiple payment batching
5. **Custom Tokens**: User-defined token support

## Dependencies

**Core Wallet Libraries:**

- `wagmi`: Web3 wallet management
- `viem`: Ethereum client library
- `@rainbow-me/rainbowkit`: Wallet connection UI

**State Management:**

- `@tanstack/react-query`: Data fetching and caching

**UI Components:**

- `@phosphor-icons/react`: Icon library
- `framer-motion`: Animations

## Troubleshooting

### Common Issues

1. **Wallet Not Detected**
   - Ensure MetaMask/Coinbase Wallet is installed
   - Check browser extension permissions

2. **Wrong Network**
   - Click "Switch to [Chain]" button
   - Manually switch in wallet if needed

3. **Quote Failures**
   - Check internet connection
   - Verify API endpoint availability
   - Try refreshing the quote

4. **Transaction Failures**
   - Check gas fees and balance
   - Verify wallet approval
   - Ensure sufficient token balance

### Debug Mode

Enable debug logging:

```typescript
console.log("Debug info:", {
  selectedChain,
  selectedToken,
  quote,
  isConnected,
  balanceData,
});
```

## Deployment

The implementation is ready for production deployment with:

- **TypeScript**: Full type safety
- **Error Boundaries**: Graceful error handling
- **Performance**: Optimized rendering and caching
- **Accessibility**: ARIA labels and keyboard navigation
- **SEO**: Proper meta tags and structured data

## Contributing

1. Follow the existing code patterns
2. Add tests for new functionality
3. Update this README for significant changes
4. Test on multiple wallet providers
5. Verify mobile responsiveness

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the test cases for expected behavior
3. Test with different wallet providers
4. Verify network connectivity and API endpoints
