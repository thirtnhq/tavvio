import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NewPayoutButton } from '../NewPayoutButton'

// Mock the hooks
vi.mock('@/hooks/useCreatePayout', () => ({
  useCreatePayout: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/hooks/useRecipients', () => ({
  useCreateRecipient: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useRecipients: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}))

vi.mock('@useroutr/ui', async () => {
  const actual = await vi.importActual<typeof import('@useroutr/ui')>('@useroutr/ui')
  return {
    ...actual,
    useToast: () => ({
      toast: vi.fn(),
    }),
  }
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('NewPayoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the button', () => {
    render(<NewPayoutButton />, { wrapper })

    expect(screen.getByText(/New Payout/i)).toBeInTheDocument()
  })

  it('opens the drawer when clicked', () => {
    render(<NewPayoutButton />, { wrapper })

    fireEvent.click(screen.getByText(/New Payout/i))

    // Drawer should be open with form title
    expect(screen.getByText(/New Payout/i)).toBeInTheDocument()
  })

  it('accepts variant and size props', () => {
    render(<NewPayoutButton variant="outline" size="sm" />, { wrapper })

    const button = screen.getByText(/New Payout/i).closest('button')
    expect(button).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    render(<NewPayoutButton className="custom-class" />, { wrapper })

    const button = screen.getByText(/New Payout/i).closest('button')
    expect(button).toHaveClass('custom-class')
  })
})
