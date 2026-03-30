import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;
}
