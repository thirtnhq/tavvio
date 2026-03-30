"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useSwitchChain, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { Wallet, ArrowRight, Coins, Clock, AlertCircle } from "@phosphor-icons/react";
import { useQuote } from "@/hooks/useQuote";
import { api } from "@/lib/api";

interface Chain {
  id: number;
  name: string;
  icon: string;
}

interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address?: string;
}

const SUPPORTED_CHAINS: Chain[] = [
  { id: 1, name: "Ethereum", icon: "ETH" },
  { id: 8453, name: "Base", icon: "BASE" },
  { id: 56, name: "BNB Chain", icon: "BNB" },
  { id: 137, name: "Polygon", icon: "POLYGON" },
  { id: 42161, name: "Arbitrum", icon: "ARB" },
  { id: 43114, name: "Avalanche", icon: "AVAX" },
];

const TOKENS_BY_CHAIN: Record<number, Token[]> = {
  1: [
    { symbol: "USDC", name: "USD Coin", decimals: 6, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    { symbol: "USDT", name: "Tether USD", decimals: 6, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
    { symbol: "ETH", name: "Ethereum", decimals: 18 },
  ],
  8453: [
    { symbol: "USDC", name: "USD Coin", decimals: 6, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    { symbol: "USDT", name: "Tether USD", decimals: 6, address: "0x509E2F92d896c8496208F272242754731b3930b6" },
    { symbol: "ETH", name: "Ethereum", decimals: 18 },
  ],
  56: [
    { symbol: "USDC", name: "USD Coin", decimals: 18, address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d" },
    { symbol: "USDT", name: "Tether USD", decimals: 18, address: "0x55d398326f99059fF775485246999027B3197955" },
    { symbol: "BNB", name: "BNB", decimals: 18 },
  ],
  137: [
    { symbol: "USDC", name: "USD Coin", decimals: 6, address: "0x3c499c544f40c594894fd951efce465d98209834" },
    { symbol: "USDT", name: "Tether USD", decimals: 6, address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f" },
    { symbol: "ETH", name: "Ethereum", decimals: 18 },
  ],
  42161: [
    { symbol: "USDC", name: "USD Coin", decimals: 6, address: "0xaf88d065e77d8c9a2bb7440e90daecaa9e378f99" },
    { symbol: "USDT", name: "Tether USD", decimals: 6, address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" },
    { symbol: "ETH", name: "Ethereum", decimals: 18 },
  ],
  43114: [
    { symbol: "USDC", name: "USD Coin", decimals: 6, address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e" },
    { symbol: "USDT", name: "Tether USD", decimals: 6, address: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7" },
    { symbol: "AVAX", name: "Avalanche", decimals: 18 },
  ],
};

interface CryptoPaymentProps {
  paymentId: string;
  merchantAmount: number;
  merchantCurrency: string;
}

export function CryptoPayment({ paymentId, merchantAmount, merchantCurrency }: CryptoPaymentProps) {
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockTxHash, setLockTxHash] = useState<string | null>(null);

  const { address, chain, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { data: balanceData } = useBalance({
    address,
    token: selectedToken?.address as `0x${string}`,
    query: {
      enabled: !!address && !!selectedToken,
    },
  });

  const { data: quoteData, isLoading: quoteLoading, error: quoteApiError } = useQuote(paymentId, selectedToken?.symbol);

  // Initialize with first chain if none selected
  useEffect(() => {
    if (!selectedChain && SUPPORTED_CHAINS.length > 0) {
      setSelectedChain(SUPPORTED_CHAINS[0]);
    }
  }, [selectedChain]);

  // Update selected token when chain changes
  useEffect(() => {
    if (selectedChain && TOKENS_BY_CHAIN[selectedChain.id]) {
      const tokens = TOKENS_BY_CHAIN[selectedChain.id];
      if (selectedToken && tokens.find(t => t.symbol === selectedToken.symbol)) {
        // Keep current token if available on new chain
        return;
      }
      setSelectedToken(tokens[0]);
    }
  }, [selectedChain, selectedToken]);

  // Update quote when token changes
  useEffect(() => {
    if (quoteData) {
      setQuote(quoteData);
      setQuoteError(null);
    } else if (quoteApiError) {
      setQuoteError("Failed to get quote. Please try again.");
    }
  }, [quoteData, quoteApiError]);

  const handleConnectWallet = async () => {
    if (!isConnected) {
      const connector = connectors[0];
      await connect({ connector });
    }
  };

  const handleSwitchChain = async () => {
    if (selectedChain && chain?.id !== selectedChain.id) {
      await switchChain({ chainId: selectedChain.id });
    }
  };

  const handleApproveAndLock = async () => {
    if (!selectedChain || !selectedToken || !quote || !address) return;

    try {
      setIsApproving(true);
      const amount = parseUnits(quote.fromAmount.toString(), selectedToken.decimals);
      const htlcAddress = "0xHTLC_CONTRACT_ADDRESS"; // This should come from API
      const receiver = "0xMERCHANT_RECEIVER_ADDRESS"; // This should come from API
      const hashlock = "0xHASHLOCK"; // This should come from API
      const timelock = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

      // Step 1: Approve token transfer (if not native token)
      if (selectedToken.address) {
        const approveTx = await writeContractAsync({
          address: selectedToken.address as `0x${string}`,
          abi: [
            {
              name: "approve",
              type: "function",
              stateMutability: "nonpayable",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" }
              ],
              outputs: [{ name: "", type: "bool" }]
            }
          ],
          functionName: "approve",
          args: [htlcAddress, amount],
        });

        await waitForTransaction(approveTx.hash);
      }

      // Step 2: Lock funds in HTLC
      setIsApproving(false);
      setIsLocking(true);

      const lockTx = await writeContractAsync({
        address: htlcAddress as `0x${string}`,
        abi: [
          {
            name: "lock",
            type: "function",
            stateMutability: "payable",
            inputs: [
              { name: "receiver", type: "address" },
              { name: "token", type: "address" },
              { name: "amount", type: "uint256" },
              { name: "hashlock", type: "bytes32" },
              { name: "timelock", type: "uint256" }
            ],
            outputs: [{ name: "lockId", type: "bytes32" }]
          }
        ],
        functionName: "lock",
        args: [receiver, selectedToken.address || "0x0000000000000000000000000000000000000000", amount, hashlock, timelock],
        value: selectedToken.address ? undefined : amount,
      });

      setLockTxHash(lockTx.hash);
      setIsLocking(false);

      // Report lock to API
      await api.post(`/payments/${paymentId}/source-lock`, {
        sourceTxHash: lockTx.hash,
        sourceLockId: lockTx.hash, // This should be the actual lock ID from the transaction
        sourceAddress: address,
      });

      // Navigate to confirmation page would happen here in a real app
      console.log("Lock transaction successful:", lockTx.hash);
    } catch (error) {
      console.error("Lock transaction failed:", error);
      setIsApproving(false);
      setIsLocking(false);
    }
  };

  const waitForTransaction = async (hash: string) => {
    // Simple polling implementation - in a real app you'd use proper transaction receipt waiting
    return new Promise<void>((resolve) => {
      const checkTx = async () => {
        try {
          // This is a simplified implementation
          // In a real app, you'd use the proper transaction receipt waiting mechanism
          setTimeout(resolve, 2000);
        } catch {
          setTimeout(checkTx, 1000);
        }
      };
      checkTx();
    });
  };

  const hasSufficientBalance = balanceData && quote ? 
    parseFloat(formatUnits(balanceData.value, selectedToken!.decimals)) >= parseFloat(quote.fromAmount) : 
    false;

  const isWrongNetwork = isConnected && chain?.id !== selectedChain?.id;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-base font-semibold text-foreground">
        Pay with crypto
      </h2>

      <div className="mt-4 space-y-4">
        {/* Chain Selection */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Select network</p>
          <div className="grid grid-cols-3 gap-2">
            {SUPPORTED_CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selectedChain?.id === chain.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border border bg-transparent text-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {chain.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Token Selection */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Select token</p>
          <div className="grid grid-cols-3 gap-2">
            {selectedChain && TOKENS_BY_CHAIN[selectedChain.id]?.map((token) => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(token)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selectedToken?.symbol === token.symbol
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border border bg-transparent text-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Quote Display */}
        {quote && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">You pay</span>
              <span className="text-xs text-muted-foreground">Rate</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-lg font-semibold">
                {quote.fromAmount} {selectedToken?.symbol}
              </span>
              <span className="text-sm text-muted-foreground">
                1 {selectedToken?.symbol} = {quote.rate} {merchantCurrency}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Fee: {quote.fee} {merchantCurrency}</span>
              <span>Merchant gets: {merchantAmount} {merchantCurrency}</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {(quoteError || quoteApiError) && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle size={16} className="text-destructive" />
            <span className="text-sm text-destructive">
              {quoteError || "Failed to get quote. Please try again."}
            </span>
          </div>
        )}

        {/* Wallet Status */}
        <div className="space-y-2">
          {!isConnected ? (
            <button
              onClick={handleConnectWallet}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110"
            >
              <Wallet size={18} />
              Connect wallet
            </button>
          ) : isWrongNetwork ? (
            <button
              onClick={handleSwitchChain}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-600"
            >
              <AlertCircle size={18} />
              Switch to {selectedChain?.name}
            </button>
          ) : !hasSufficientBalance ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm font-medium text-destructive">
              <AlertCircle size={18} />
              Insufficient balance
            </div>
          ) : (
            <button
              onClick={handleApproveAndLock}
              disabled={isApproving || isLocking || !quote}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApproving ? (
                <>
                  <Coins size={18} className="animate-spin" />
                  Approving...
                </>
              ) : isLocking ? (
                <>
                  <Clock size={18} className="animate-spin" />
                  Locking funds...
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  Approve & Pay
                </>
              )}
            </button>
          )}

          {isConnected && (
            <div className="text-center text-xs text-muted-foreground">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          )}
        </div>

        {/* Transaction Status */}
        {lockTxHash && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
            <span className="text-sm text-green-700">Transaction submitted!</span>
            <a
              href={`https://etherscan.io/tx/${lockTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View on explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
