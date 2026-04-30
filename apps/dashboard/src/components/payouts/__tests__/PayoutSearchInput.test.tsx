import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PayoutSearchInput } from '../PayoutSearchInput'

describe('PayoutSearchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default placeholder', () => {
    render(<PayoutSearchInput onSearch={vi.fn()} />)

    expect(screen.getByPlaceholderText('Search by recipient or payout ID...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<PayoutSearchInput onSearch={vi.fn()} placeholder="Custom placeholder" />)

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })

  it('calls onSearch after debounce when typing', async () => {
    const onSearch = vi.fn()
    render(<PayoutSearchInput onSearch={onSearch} debounceMs={100} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test query' } })

    // Should not be called immediately
    expect(onSearch).not.toHaveBeenCalled()

    // Should be called after debounce
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('test query'), {
      timeout: 200,
    })
  })

  it('clears search when X button is clicked', async () => {
    const onSearch = vi.fn()
    render(<PayoutSearchInput onSearch={onSearch} debounceMs={100} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test query' } })

    // Wait for X button to appear
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)

    expect(input).toHaveValue('')
    await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith(''), {
      timeout: 200,
    })
  })

  it('initializes with provided value', () => {
    render(<PayoutSearchInput onSearch={vi.fn()} value="initial value" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('initial value')
  })
})
