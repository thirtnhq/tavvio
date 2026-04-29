import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConfirmationModal } from '../ConfirmationModal'

describe('ConfirmationModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
    recipientName: 'John Doe',
    destinationType: 'STELLAR' as const,
    destination: { type: 'STELLAR', address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNO', asset: 'native' },
    amount: '100',
    currency: 'USD',
    fee: '1.50',
    feeCurrency: 'USD',
  }

  it('renders when open', () => {
    render(<ConfirmationModal {...defaultProps} />)

    expect(screen.getByText(/Confirm Payout/i)).toBeInTheDocument()
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
    expect(screen.getByText(/\$100\.00/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ConfirmationModal {...defaultProps} open={false} />)

    expect(screen.queryByText(/Confirm Payout/i)).not.toBeInTheDocument()
  })

  it('displays destination type badge', () => {
    render(<ConfirmationModal {...defaultProps} />)

    expect(screen.getByText(/Stellar/i)).toBeInTheDocument()
  })

  it('displays fee breakdown', () => {
    render(<ConfirmationModal {...defaultProps} />)

    expect(screen.getByText(/Fee/i)).toBeInTheDocument()
    expect(screen.getByText('$1.50')).toBeInTheDocument()
    expect(screen.getByText(/Total/i)).toBeInTheDocument()
    expect(screen.getByText('$101.50')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByText(/Confirm & Send/i))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled()
    })
  })

  it('calls onOpenChange when cancel button clicked', () => {
    const onOpenChange = vi.fn()
    render(<ConfirmationModal {...defaultProps} onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByText(/Cancel/i))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables buttons when loading', () => {
    render(<ConfirmationModal {...defaultProps} isLoading={true} />)

    expect(screen.getByText(/Processing/i)).toBeDisabled()
    expect(screen.getByText(/Cancel/i)).toBeDisabled()
  })

  it('shows warning about irreversible action', () => {
    render(<ConfirmationModal {...defaultProps} />)

    expect(screen.getByText(/cannot be recalled once processed/i)).toBeInTheDocument()
  })

  it('renders with Bank Account details', () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        destinationType="BANK_ACCOUNT"
        destination={{ type: 'BANK_ACCOUNT', accountNumber: '1234567890', bankName: 'Chase', country: 'US' }}
      />
    )

    expect(screen.getByText(/Bank Account/i)).toBeInTheDocument()
    expect(screen.getByText(/Chase/i)).toBeInTheDocument()
    expect(screen.getByText(/US/i)).toBeInTheDocument()
  })

  it('renders with Mobile Money details', () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        destinationType="MOBILE_MONEY"
        destination={{ type: 'MOBILE_MONEY', phoneNumber: '+2348012345678', provider: 'MTN', country: 'NG' }}
      />
    )

    expect(screen.getByText(/Mobile Money/i)).toBeInTheDocument()
    expect(screen.getByText(/MTN/i)).toBeInTheDocument()
    expect(screen.getByText(/\+2348012345678/i)).toBeInTheDocument()
  })

  it('renders with Crypto Wallet details', () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        destinationType="CRYPTO_WALLET"
        destination={{ type: 'CRYPTO_WALLET', address: '0x1234567890abcdef', network: 'ethereum', asset: 'USDC' }}
      />
    )

    expect(screen.getByText(/Crypto Wallet/i)).toBeInTheDocument()
    expect(screen.getByText(/ethereum/i)).toBeInTheDocument()
    expect(screen.getByText(/USDC/i)).toBeInTheDocument()
  })

  it('truncates long addresses', () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        destinationType="STELLAR"
        destination={{ type: 'STELLAR', address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNO', asset: 'native' }}
      />
    )

    // Should show truncated address
    expect(screen.getByText(/GABCDEF\.\.\.LMNO/)).toBeInTheDocument()
  })
})
