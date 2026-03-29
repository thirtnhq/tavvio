import { IsIn, IsOptional, IsString } from 'class-validator';

const SUPPORTED_ASSETS = ['USDC', 'USDT', 'XLM', 'ETH', 'DAI'];
const SUPPORTED_CHAINS = [
  'stellar',
  'ethereum',
  'base',
  'bnb',
  'polygon',
  'arbitrum',
  'avalanche',
  'solana',
  'starknet',
];

export class SettlementDto {
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_ASSETS)
  settlementAsset?: string;

  @IsOptional()
  @IsString()
  settlementAddress?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CHAINS)
  settlementChain?: string;
}
