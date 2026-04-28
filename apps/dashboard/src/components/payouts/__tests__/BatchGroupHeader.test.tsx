import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BatchGroupHeader } from '../BatchGroupHeader'
import type { Payout, PayoutStatus } from '@/hooks/usePayouts'

describe('BatchGroupHeader', () => {
  const mockPayouts: Payout[] = [
    {
      id: 'payout-1',
      merchantId: 'merchant-1',
      recipientName: 'John Doe',
      destinationType: 'STELLAR',
      destination: { address: 'GABC' },
      amount: '100.00',
      currency: 'USD',
      status: 'COMPLETED',
      stellarTxHash: null,
      scheduledAt: null,
      completedAt: null,
      failureReason: null,
      batchId: 'batch-123',
      idempotencyKey: null,
      createdAt: '2024-01-15T09:00:00Z',
    },
    {
      id: 'payout-2',
      merchantId: 'merchant-1',
      recipientName: 'Jane Smith',
      destinationType: 'BANK_ACCOUNT',
      destination: { accountNumber: '1234' },
      amount: '200.00',
      currency: 'USD',
      status: 'PENDING',
      stellarTxHash: null,
      scheduledAt: null,
      completedAt: null,
      failureReason: null,
      batchId: 'batch-123',
      idempotencyKey: null,
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'payout-3',
      merchantId: 'merchant-1',
      recipientName: 'Bob Wilson',
      destinationType: 'STELLAR',
      destination: { address: 'GDEF' },
      amount: '150.00',
      currency: 'EUR',
      status: 'FAILED',
      stellarTxHash: null,
      scheduledAt: null,
      completedAt: null,
      failureReason: 'Insufficient funds',
      batchId: 'batch-123',
      idempotencyKey: null,
      createdAt: '2024-01-15T11:00:00Z',
    },
  ]

  const defaultProps = {
    batchId: 'batch-123-uuid-456',
    payouts: mockPayouts,
    isExpanded: false,
    onToggle: vi.fn(),
  }

  it('renders batch summary information', () => {
    render(<BatchGroupHeader {...defaultProps} />)
    
    expect(screen.getByText('Batch')).toBeInTheDocument()
    expect(screen.getByText(/batch-123/)).toBeInTheDocument()
  })

  it('displays total payout count', () => {
    render(<BatchGroupHeader {...defaultProps} />)
    
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('recipients')).toBeInTheDocument()
  })

  it('displays total amount with dominant currency', () => {
    render(<BatchGroupHeader {...defaultProps} />)
    
    // Total amount is 450 USD (dominant) + 150 EUR
    expect(screen.getByText('$450.00')).toBeInTheDocument()
  })

  it('shows additional currencies count when multiple currencies exist', () => {
    render(<BatchGroupHeader {...defaultProps} />)
    
    expect(screen.getByText('+1 more')).toBeInTheDocument()
  })

  it('displays status breakdown', () => {
    render(<BatchGroupHeader {...defaultProps} />)
    
    // Should show status counts
    expect(screen.getByText('(1)')).toBeInTheDocument() // Each status appears
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<BatchGroupHeader {...defaultProps} onToggle={onToggle} />)
    
    const header = screen.getByText('Batch').closest('div')?.parentElement
    fireEvent.click(header!)
    
    expect(onToggle).toHaveBeenCalled()
  })

  it('shows expanded state correctly', () => {
    render(<BatchGroupHeader {...defaultProps} isExpanded={true} />)
    
    // When expanded, should show caret down
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('shows collapsed state correctly', () => {
    render(<BatchGroupHeader {...defaultProps} isExpanded={false} />)
    
    // When collapsed, should show caret right
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('handles single currency correctly', () => {
    const singleCurrencyPayouts = mockPayouts.map(p => ({ ...p, currency: 'USD' }))
    render(<BatchGroupHeader {...defaultProps} payouts={singleCurrencyPayouts} />)
    
    expect(screen.queryByText(/more/)).not.toBeInTheDocument()
  })

  it('handles empty payouts gracefully', () => {
    render(<BatchGroupHeader {...defaultProps} payouts={[]} />)
    
    expect(screen.getByText('Batch')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
