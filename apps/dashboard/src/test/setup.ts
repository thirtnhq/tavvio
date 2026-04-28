import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(),
  }),
  usePathname: () => '/payouts',
}))

// Mock next/head
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock @useroutr/ui toast
vi.mock('@useroutr/ui', async () => {
  const actual = await vi.importActual<typeof import('@useroutr/ui')>('@useroutr/ui')
  return {
    ...actual,
    useToast: () => ({
      toast: vi.fn(),
    }),
  }
})

// Global fetch mock
global.fetch = vi.fn()

// Mock window.URL.createObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
})
