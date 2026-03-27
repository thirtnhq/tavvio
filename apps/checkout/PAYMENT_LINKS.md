# Payment Links Implementation

## Overview

Consumer-facing landing page for payment links at `/l/[linkId]` that serves as the bridge between payment links and the checkout flow.

## Features

### Fixed Amount Links
- Display merchant branding (logo, name)
- Show product/service description
- Display fixed amount with currency formatting
- "Pay Now" button that creates payment and redirects to checkout

### Open Amount Links  
- Same branding and description display
- Amount input field with currency formatting
- Validation for minimum amount
- "Continue to Payment" button

### Error States
- **Link not found**: Invalid linkId
- **Link expired**: Past expiration date with formatted date display
- **Already redeemed**: Single-use links that have been used
- **Link inactive**: Deactivated by merchant

### Validation
- Email format validation with error messages
- Amount validation for open amount links
- Real-time error clearing on user input

## Components

### `LinkCard`
Main card displaying merchant info, description, and amount (fixed or input)

### `ExpiryBadge` 
Shows expiration date with visual indicators for expired links

### `LinkError`
Full-page error states with appropriate icons and messaging

### `LinkSkeleton`
Loading state with animated placeholders

### `TrustBadges`
Security indicators and "Powered by Useroutr" branding

## API Integration

### GET `/pay/:linkId`
Fetches link data including:
- Merchant name and logo
- Description
- Amount (null for open amount)
- Currency
- Expiration date
- Active status

### POST `/v1/payments`
Creates payment with link context:
- Link ID
- Amount (for open amount links)
- Customer email
- Returns payment ID for checkout redirect

## Mobile Responsive
- Optimized for 375px mobile layout
- Touch-friendly input fields
- Proper spacing and typography scaling

## Error Handling
- Network error handling with user-friendly messages
- Form validation with inline error display
- Loading states during API calls
- Graceful degradation for missing data

## Usage

```typescript
// Fixed amount link
/l/abc123 → Shows $50.00 with "Pay Now"

// Open amount link  
/l/def456 → Shows amount input with "Continue to Payment"

// Expired link
/l/expired → Shows error with expiration date

// Invalid link
/l/invalid → Shows "link not found" error
```