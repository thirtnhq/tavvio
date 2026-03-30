import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { CryptoPayment } from '../components/CryptoPayment';
import { QuoteCountdown } from '../components/QuoteCountdown';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: null, chain: null, isConnected: false }),
  useConnect: () => ({ connect: jest.fn(), connectors: [] }),
  useSwitchChain: () => ({ switchChain: jest.fn() }),
  useBalance: () => ({ data: null }),
  useWriteContract: () => ({ writeContractAsync: jest.fn() }),
}));

// Mock viem
jest.mock('viem', () => ({
  formatUnits: jest.fn((value) => value),
  parseUnits: jest.fn((value) => value),
}));

// Mock @phosphor-icons/react
jest.mock('@phosphor-icons/react', () => ({
  Wallet: () => <div>Wallet Icon</div>,
  ArrowRight: () => <div>Arrow Icon</div>,
  Coins: () => <div>Coins Icon</div>,
  Clock: () => <div>Clock Icon</div>,
  AlertCircle: () => <div>Alert Icon</div>,
  Timer: () => <div>Timer Icon</div>,
}));

// Mock hooks
jest.mock('../hooks/useQuote', () => ({
  useQuote: () => ({ data: null, isLoading: false, error: null }),
}));

jest.mock('../lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  const wagmiConfig = {
    chains: [],
    transports: {},
  };

  return render(
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

describe('CryptoPayment', () => {
  const defaultProps = {
    paymentId: 'test-payment-id',
    merchantAmount: 50,
    merchantCurrency: 'USD',
  };

  it('renders crypto payment component', () => {
    renderWithProviders(<CryptoPayment {...defaultProps} />);
    
    expect(screen.getByText('Pay with crypto')).toBeInTheDocument();
    expect(screen.getByText('Select network')).toBeInTheDocument();
    expect(screen.getByText('Select token')).toBeInTheDocument();
  });

  it('displays chain selection buttons', () => {
    renderWithProviders(<CryptoPayment {...defaultProps} />);
    
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('BASE')).toBeInTheDocument();
    expect(screen.getByText('BNB')).toBeInTheDocument();
  });

  it('displays token selection buttons for selected chain', () => {
    renderWithProviders(<CryptoPayment {...defaultProps} />);
    
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('USDT')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('shows connect wallet button when not connected', () => {
    renderWithProviders(<CryptoPayment {...defaultProps} />);
    
    expect(screen.getByText('Connect wallet')).toBeInTheDocument();
  });
});

describe('QuoteCountdown', () => {
  it('renders countdown timer', () => {
    render(<QuoteCountdown />);
    
    expect(screen.getByText('Quote expires in')).toBeInTheDocument();
  });

  it('shows expired state when time is up', () => {
    const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    
    render(<QuoteCountdown expiresAt={expiresAt} />);
    
    expect(screen.getByText('Quote expired')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('calls onExpired callback when time expires', async () => {
    const onExpired = jest.fn();
    const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    
    render(<QuoteCountdown expiresAt={expiresAt} onExpired={onExpired} />);
    
    await waitFor(() => {
      expect(onExpired).toHaveBeenCalled();
    });
  });
});