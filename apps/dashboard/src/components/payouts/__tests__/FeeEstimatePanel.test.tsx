import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeeEstimatePanel } from '../FeeEstimatePanel'

describe('FeeEstimatePanel', () => {
  it('shows placeholder when no amount entered', () => {
    render(
      <FeeEstimatePanel
        amount=""
        currency="USD"
        isLoading={false}
      />
    )

    expect(screen.getByText(/Enter an amount to see fee estimate/i)).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', () => {
    const { container } = render(
      <FeeEstimatePanel
        amount="100"
        currency="USD"
        isLoading={true}
      />
    )

    // Skeleton loading state - check for skeleton class
    expect(container.querySelector('[class*="skeleton"]')).toBeInTheDocument()
  })

  it('displays fee estimate when loaded', () => {
    render(
      <FeeEstimatePanel
        amount="100"
        currency="USD"
        fee="1.50"
        feeCurrency="USD"
        total="101.50"
        isLoading={false}
      />
    )

    expect(screen.getByText(/Fee Estimate/i)).toBeInTheDocument()
    expect(screen.getByText('$1.50')).toBeInTheDocument()
    expect(screen.getByText(/Total/i)).toBeInTheDocument()
    expect(screen.getByText('$101.50')).toBeInTheDocument()
  })

  it('shows exchange rate when available', () => {
    render(
      <FeeEstimatePanel
        amount="100"
        currency="USD"
        fee="1.50"
        feeCurrency="USD"
        total="101.50"
        exchangeRate="0.92"
        isLoading={false}
      />
    )

    expect(screen.getByText(/Exchange Rate/i)).toBeInTheDocument()
    expect(screen.getByText(/1 USD = 0.92/i)).toBeInTheDocument()
  })

  it('shows error state when API fails', () => {
    render(
      <FeeEstimatePanel
        amount="100"
        currency="USD"
        isLoading={false}
        error={new Error('Network error')}
      />
    )

    expect(screen.getByText(/Fee estimate unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/Fees will be calculated at time of submission/i)).toBeInTheDocument()
  })

  it('shows disclaimer about fee estimates', () => {
    render(
      <FeeEstimatePanel
        amount="100"
        currency="USD"
        fee="1.50"
        feeCurrency="USD"
        total="101.50"
        isLoading={false}
      />
    )

    expect(screen.getByText(/Fees are estimates and may vary/i)).toBeInTheDocument()
  })
})
