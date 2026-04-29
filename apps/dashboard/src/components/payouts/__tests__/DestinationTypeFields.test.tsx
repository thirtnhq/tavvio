import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DestinationTypeFields } from '../DestinationTypeFields'
import type { DestType, PayoutDestination } from '@useroutr/types'

describe('DestinationTypeFields', () => {
  const defaultProps = {
    destinationType: 'STELLAR' as DestType,
    destination: { type: 'STELLAR', address: '', asset: 'native' } as PayoutDestination,
    onChange: vi.fn(),
    errors: {},
  }

  it('renders Stellar fields', () => {
    render(<DestinationTypeFields {...defaultProps} />)

    expect(screen.getByLabelText(/Stellar Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Asset/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Memo/i)).toBeInTheDocument()
  })

  it('renders Bank Account fields', () => {
    render(
      <DestinationTypeFields
        {...defaultProps}
        destinationType="BANK_ACCOUNT"
        destination={{ type: 'BANK_ACCOUNT', accountNumber: '', bankName: '', country: 'US' }}
      />
    )

    expect(screen.getByLabelText(/Account Number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Routing Number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Bank Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument()
  })

  it('renders Mobile Money fields', () => {
    render(
      <DestinationTypeFields
        {...defaultProps}
        destinationType="MOBILE_MONEY"
        destination={{ type: 'MOBILE_MONEY', phoneNumber: '', provider: '', country: 'NG' }}
      />
    )

    expect(screen.getByLabelText(/Provider/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument()
  })

  it('renders Crypto Wallet fields', () => {
    render(
      <DestinationTypeFields
        {...defaultProps}
        destinationType="CRYPTO_WALLET"
        destination={{ type: 'CRYPTO_WALLET', address: '', network: 'ethereum', asset: 'USDC' }}
      />
    )

    expect(screen.getByLabelText(/Wallet Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Network/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Asset/i)).toBeInTheDocument()
  })

  it('calls onChange when Stellar address changes', () => {
    const onChange = vi.fn()
    render(
      <DestinationTypeFields
        {...defaultProps}
        onChange={onChange}
      />
    )

    fireEvent.change(screen.getByLabelText(/Stellar Address/i), {
      target: { value: 'GABCDEF123' },
    })

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STELLAR',
      address: 'GABCDEF123',
    }))
  })

  it('calls onChange when Bank Account fields change', () => {
    const onChange = vi.fn()
    render(
      <DestinationTypeFields
        {...defaultProps}
        destinationType="BANK_ACCOUNT"
        destination={{ type: 'BANK_ACCOUNT', accountNumber: '', bankName: '', country: 'US' }}
        onChange={onChange}
      />
    )

    fireEvent.change(screen.getByLabelText(/Account Number/i), {
      target: { value: '1234567890' },
    })

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      type: 'BANK_ACCOUNT',
      accountNumber: '1234567890',
    }))
  })

  it('displays field-level errors', () => {
    render(
      <DestinationTypeFields
        {...defaultProps}
        errors={{ address: 'Invalid address' }}
      />
    )

    expect(screen.getByText('Invalid address')).toBeInTheDocument()
  })

  it('preserves existing destination data when changing fields', () => {
    const onChange = vi.fn()
    render(
      <DestinationTypeFields
        {...defaultProps}
        destination={{
          type: 'STELLAR',
          address: 'GABCDEF',
          asset: 'USDC',
          memo: 'Test memo',
        }}
        onChange={onChange}
      />
    )

    fireEvent.change(screen.getByLabelText(/Stellar Address/i), {
      target: { value: 'GNEWADDRESS' },
    })

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STELLAR',
      address: 'GNEWADDRESS',
      asset: 'USDC',
      memo: 'Test memo',
    }))
  })
})
