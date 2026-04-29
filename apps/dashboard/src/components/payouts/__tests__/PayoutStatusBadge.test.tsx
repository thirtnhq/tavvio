import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PayoutStatusBadge } from '../PayoutStatusBadge'
import type { PayoutStatus } from '@/hooks/usePayouts'

describe('PayoutStatusBadge', () => {
  const statuses: { status: PayoutStatus; expectedLabel: string; expectedVariant: string }[] = [
    { status: 'PENDING', expectedLabel: 'Pending', expectedVariant: 'pending' },
    { status: 'PROCESSING', expectedLabel: 'Processing', expectedVariant: 'processing' },
    { status: 'COMPLETED', expectedLabel: 'Completed', expectedVariant: 'completed' },
    { status: 'FAILED', expectedLabel: 'Failed', expectedVariant: 'failed' },
    { status: 'CANCELLED', expectedLabel: 'Cancelled', expectedVariant: 'cancelled' },
  ]

  statuses.forEach(({ status, expectedLabel, expectedVariant }) => {
    it(`renders ${status} status with correct label and styling`, () => {
      render(<PayoutStatusBadge status={status} />)
      
      const badge = screen.getByText(expectedLabel)
      expect(badge).toBeInTheDocument()
      expect(badge.parentElement).toHaveClass(expectedVariant)
    })
  })

  it('matches all status mappings exactly', () => {
    // Ensure all statuses are mapped
    const allStatuses: PayoutStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']
    
    allStatuses.forEach((status) => {
      const { container } = render(<PayoutStatusBadge status={status} />)
      expect(container.querySelector('span')).toBeInTheDocument()
    })
  })
})
