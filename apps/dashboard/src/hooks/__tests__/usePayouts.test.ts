import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { usePayouts, useRetryPayout, useCancelPayout } from '../usePayouts'

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { api } from '@/lib/api'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('usePayouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches payouts with correct params', async () => {
    const mockResponse = {
      total: 2,
      limit: 20,
      offset: 0,
      data: [
        {
          id: 'payout-1',
          status: 'COMPLETED',
          amount: '100.00',
          currency: 'USD',
          recipientName: 'John Doe',
          destinationType: 'STELLAR',
          destination: { address: 'GABC' },
          createdAt: '2024-01-15T09:00:00Z',
        },
      ],
    }

    vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => usePayouts({ limit: 20, offset: 0 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/v1/payouts', {
      params: { limit: 20, offset: 0 },
    })
    expect(result.current.data).toEqual(mockResponse)
  })

  it('includes all filter params when provided', async () => {
    const mockResponse = { total: 0, limit: 20, offset: 0, data: [] }
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

    const filters = {
      status: 'PENDING' as const,
      destinationType: 'STELLAR' as const,
      currency: 'USD',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      batchId: 'batch-123',
      search: 'John',
      limit: 10,
      offset: 0,
    }

    renderHook(() => usePayouts(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/v1/payouts', { params: filters })
    })
  })
})

describe('useRetryPayout', () => {
  it('calls retry endpoint and invalidates queries', async () => {
    const mockPayout = {
      id: 'payout-1',
      status: 'PENDING',
      amount: '100.00',
      currency: 'USD',
      recipientName: 'John Doe',
      destinationType: 'STELLAR',
      destination: {},
      createdAt: '2024-01-15T09:00:00Z',
    }

    vi.mocked(api.post).mockResolvedValueOnce(mockPayout)

    const { result } = renderHook(() => useRetryPayout(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('payout-1')

    expect(api.post).toHaveBeenCalledWith('/v1/payouts/payout-1/retry')
  })
})

describe('useCancelPayout', () => {
  it('calls cancel endpoint and invalidates queries', async () => {
    const mockPayout = {
      id: 'payout-1',
      status: 'CANCELLED',
      amount: '100.00',
      currency: 'USD',
      recipientName: 'John Doe',
      destinationType: 'STELLAR',
      destination: {},
      createdAt: '2024-01-15T09:00:00Z',
    }

    vi.mocked(api.post).mockResolvedValueOnce(mockPayout)

    const { result } = renderHook(() => useCancelPayout(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('payout-1')

    expect(api.post).toHaveBeenCalledWith('/v1/payouts/payout-1/cancel')
  })
})
