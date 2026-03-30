import { IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class BrandingDto {
  @IsOptional()
  @IsString()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'brandColor must be a valid hex color (e.g. #FF5733)' })
  brandColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  customDomain?: string;
}
