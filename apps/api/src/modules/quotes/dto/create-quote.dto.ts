import { Chain } from '@useroutr/types';
import { IsEnum, IsString, IsOptional } from 'class-validator';

export class CreateQuoteDto {
  /**
   * Source chain (ethereum, base, stellar, etc.)
   */
  @IsEnum([
    'stellar',
    'ethereum',
    'base',
    'bnb',
    'polygon',
    'arbitrum',
    'avalanche',
    'solana',
    'starknet',
  ])
  fromChain!: Chain;

  /**
   * Source asset symbol (ETH, USDC, etc.)
   */
  @IsString()
  fromAsset!: string;

  /**
   * Source amount as decimal string (e.g., "100.50")
   */
  @IsString()
  fromAmount!: string;

  /**
   * Destination chain - defaults to merchant's settlementChain
   */
  @IsEnum([
    'stellar',
    'ethereum',
    'base',
    'bnb',
    'polygon',
    'arbitrum',
    'avalanche',
    'solana',
    'starknet',
  ])
  @IsOptional()
  toChain?: Chain;

  /**
   * Destination asset - defaults to merchant's settlementAsset
   */
  @IsString()
  @IsOptional()
  toAsset?: string;
}
