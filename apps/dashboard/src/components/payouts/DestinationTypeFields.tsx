"use client";

import { Input, Label, Select } from "@useroutr/ui";
import type { DestType, PayoutDestination } from "@useroutr/types";

interface DestinationTypeFieldsProps {
  destinationType: DestType;
  destination: PayoutDestination;
  onChange: (destination: PayoutDestination) => void;
  errors?: Record<string, string>;
}

const MOBILE_MONEY_PROVIDERS = [
  { value: "MTN", label: "MTN Mobile Money" },
  { value: "M-PESA", label: "M-Pesa" },
  { value: "AIRTEL", label: "Airtel Money" },
  { value: "ORANGE", label: "Orange Money" },
  { value: "WAVE", label: "Wave" },
];

const CRYPTO_NETWORKS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "bitcoin", label: "Bitcoin" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
  { value: "base", label: "Base" },
  { value: "solana", label: "Solana" },
  { value: "stellar", label: "Stellar" },
];

const CRYPTO_ASSETS = [
  { value: "USDC", label: "USDC" },
  { value: "USDT", label: "USDT" },
  { value: "ETH", label: "ETH" },
  { value: "BTC", label: "BTC" },
  { value: "XLM", label: "XLM" },
];

const COUNTRY_CODES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "NG", label: "Nigeria" },
  { value: "KE", label: "Kenya" },
  { value: "GH", label: "Ghana" },
  { value: "ZA", label: "South Africa" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "AE", label: "UAE" },
  { value: "SG", label: "Singapore" },
  { value: "CH", label: "Switzerland" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
];

export function DestinationTypeFields({
  destinationType,
  destination,
  onChange,
  errors = {},
}: DestinationTypeFieldsProps) {
  const handleChange = (field: string, value: string) => {
    onChange({
      ...destination,
      [field]: value,
    });
  };

  switch (destinationType) {
    case "BANK_ACCOUNT":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number *</Label>
            <Input
              id="accountNumber"
              placeholder="e.g. 000123456789"
              value={destination.accountNumber || ""}
              onChange={(e) => handleChange("accountNumber", e.target.value)}
              error={errors.accountNumber}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="routingNumber">Routing Number (optional)</Label>
            <Input
              id="routingNumber"
              placeholder="e.g. 021000021"
              value={destination.routingNumber || ""}
              onChange={(e) => handleChange("routingNumber", e.target.value)}
              error={errors.routingNumber}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name *</Label>
            <Input
              id="bankName"
              placeholder="e.g. Chase Bank"
              value={destination.bankName || ""}
              onChange={(e) => handleChange("bankName", e.target.value)}
              error={errors.bankName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Select
              id="country"
              value={destination.country || "US"}
              onChange={(e) => handleChange("country", e.target.value)}
              error={errors.country}
            >
              {COUNTRY_CODES.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      );

    case "MOBILE_MONEY":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider *</Label>
            <Select
              id="provider"
              value={destination.provider || ""}
              onChange={(e) => handleChange("provider", e.target.value)}
              error={errors.provider}
            >
              <option value="">Select provider...</option>
              {MOBILE_MONEY_PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="e.g. +234 80 1234 5678"
              value={destination.phoneNumber || ""}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              error={errors.phoneNumber}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Select
              id="country"
              value={destination.country || "NG"}
              onChange={(e) => handleChange("country", e.target.value)}
              error={errors.country}
            >
              {COUNTRY_CODES.filter(c => ["NG", "KE", "GH", "ZA"].includes(c.value)).map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      );

    case "CRYPTO_WALLET":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Wallet Address *</Label>
            <Input
              id="address"
              placeholder="e.g. 0x..."
              value={destination.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              error={errors.address}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="network">Network *</Label>
            <Select
              id="network"
              value={destination.network || "ethereum"}
              onChange={(e) => handleChange("network", e.target.value)}
              error={errors.network}
            >
              {CRYPTO_NETWORKS.map((network) => (
                <option key={network.value} value={network.value}>
                  {network.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset">Asset *</Label>
            <Select
              id="asset"
              value={destination.asset || "USDC"}
              onChange={(e) => handleChange("asset", e.target.value)}
              error={errors.asset}
            >
              {CRYPTO_ASSETS.map((asset) => (
                <option key={asset.value} value={asset.value}>
                  {asset.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      );

    case "STELLAR":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Stellar Address (G-address) *</Label>
            <Input
              id="address"
              placeholder="e.g. GABCDEF..."
              value={destination.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              error={errors.address}
            />
            <p className="text-xs text-muted-foreground">
              Must be a valid Stellar public key starting with G
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select
              id="asset"
              value={destination.asset || "native"}
              onChange={(e) => handleChange("asset", e.target.value)}
              error={errors.asset}
            >
              <option value="native">XLM (Native)</option>
              <option value="USDC">USDC</option>
              <option value="EURC">EURC</option>
              <option value="BTC">BTC (Stellar)</option>
              <option value="ETH">ETH (Stellar)</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">Memo (optional)</Label>
            <Input
              id="memo"
              placeholder="e.g. Invoice #123"
              value={destination.memo || ""}
              onChange={(e) => handleChange("memo", e.target.value)}
              error={errors.memo}
              maxLength={28}
            />
            <p className="text-xs text-muted-foreground">
              Required by some exchanges to identify your account
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
