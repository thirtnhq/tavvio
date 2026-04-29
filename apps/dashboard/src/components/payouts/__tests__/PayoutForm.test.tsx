import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PayoutForm } from '../PayoutForm'

// Mock the hooks
vi.mock('@/hooks/useFeeEstimate', () => ({
  useFeeEstimate: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
}))

vi.mock('@/hooks/useRecipients', () => ({
  useRecipients: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('PayoutForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form with all required fields', () => {
    render(<PayoutForm {...defaultProps} />, { wrapper })

    expect(screen.getByLabelText(/Recipient Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument()
  })

  it('renders destination type buttons', () => {
    render(<PayoutForm {...defaultProps} />, { wrapper })

    expect(screen.getByText('Stellar')).toBeInTheDocument()
    expect(screen.getByText('Bank Account')).toBeInTheDocument()
    expect(screen.getByText('Mobile Money')).toBeInTheDocument()
    expect(screen.getByText('Crypto Wallet')).toBeInTheDocument()
  })

  it('switches destination type and shows appropriate fields', () => {
    render(<PayoutForm {...defaultProps} />, { wrapper })

    // Default is Stellar
    expect(screen.getByLabelText(/Stellar Address/i)).toBeInTheDocument()

    // Click Bank Account
    fireEvent.click(screen.getByText('Bank Account'))
    expect(screen.getByLabelText(/Account Number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Bank Name/i)).toBeInTheDocument()

    // Click Mobile Money
    fireEvent.click(screen.getByText('Mobile Money'))
    expect(screen.getByLabelText(/Provider/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument()

    // Click Crypto Wallet
    fireEvent.click(screen.getByText('Crypto Wallet'))
    expect(screen.getByLabelText(/Wallet Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Network/i)).toBeInTheDocument()
  })

  it('validates required fields before review', async () => {
    render(<PayoutForm {...defaultProps} />, { wrapper })

    // Click review without filling form
    fireEvent.click(screen.getByText('Review'))

    await waitFor(() => {
      expect(screen.getByText(/Recipient name is required/i)).toBeInTheDocument()
    })
  })

  it('clears errors when user starts typing', async () => {
    render(<PayoutForm {...defaultProps} />, { wrapper })

    // Trigger validation error
    fireEvent.click(screen.getByText('Review'))

    await waitFor(() => {
      expect(screen.getByText(/Recipient name is required/i)).toBeInTheDocument()
    })

    // Type in recipient name
    fireEvent.change(screen.getByLabelText(/Recipient Name/i), {
      target: { value: 'John Doe' },
    })

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/Recipient name is required/i)).not.toBeInTheDocument()
    })
  })

  it('shows confirmation modal when form is valid', async () => {
    render(<PayoutForm {...defaultProps} />, { wrapper })

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Recipient Name/i), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByLabelText(/Stellar Address/i), {
      target: { value: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNO' },
    })
    fireEvent.change(screen.getByLabelText(/Amount/i), {
      target: { value: '100' },
    })

    // Click review
    fireEvent.click(screen.getByText('Review'))

    // Wait for confirmation modal
    await waitFor(() => {
      expect(screen.getByText(/Confirm Payout/i)).toBeInTheDocument()
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(<PayoutForm {...defaultProps} />, { wrapper })

    fireEvent.click(screen.getByText('Cancel'))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('shows save recipient checkbox', () => {
    render(<PayoutForm {...defaultProps} />, { wrapper })

    expect(screen.getByLabelText(/Save recipient for future payouts/i)).toBeInTheDocument()
  })

  it('disables buttons during submission', () => {
    render(<PayoutForm {...defaultProps} isSubmitting={true} />, { wrapper })

    expect(screen.getByText('Cancel')).toBeDisabled()
    expect(screen.getByText('Review')).toBeDisabled()
  })
})
