import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CancelConfirmationModal } from '../CancelConfirmationModal'

describe('CancelConfirmationModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
    recipientName: 'John Doe',
    amount: '100.00',
    currency: 'USD',
  }

  it('renders when open', () => {
    render(<CancelConfirmationModal {...defaultProps} />)

    expect(screen.getByText('Cancel Payout?')).toBeInTheDocument()
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    expect(screen.getByText(/\$100.00/)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<CancelConfirmationModal {...defaultProps} open={false} />)

    expect(screen.queryByText('Cancel Payout?')).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()
    render(<CancelConfirmationModal {...defaultProps} onConfirm={onConfirm} />)

    const confirmButton = screen.getByText('Yes, Cancel Payout')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled()
    })
  })

  it('calls onOpenChange when cancel button clicked', () => {
    const onOpenChange = vi.fn()
    render(<CancelConfirmationModal {...defaultProps} onOpenChange={onOpenChange} />)

    const cancelButton = screen.getByText('Keep Payout')
    fireEvent.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables buttons when loading', () => {
    render(<CancelConfirmationModal {...defaultProps} isLoading={true} />)

    const confirmButton = screen.getByText('Cancelling...')
    const cancelButton = screen.getByText('Keep Payout')

    expect(confirmButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
  })

  it('shows warning icon and appropriate messaging', () => {
    render(<CancelConfirmationModal {...defaultProps} />)

    expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument()
  })

  it('renders without payout details when not provided', () => {
    render(
      <CancelConfirmationModal
        {...defaultProps}
        recipientName={undefined}
        amount={undefined}
        currency={undefined}
      />
    )

    expect(screen.getByText('Cancel Payout?')).toBeInTheDocument()
    // Should not crash without details
  })
})
