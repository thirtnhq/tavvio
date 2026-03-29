import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class KybSubmissionDto {
  @IsString()
  @MaxLength(100)
  businessType!: string;

  @IsString()
  @MaxLength(100)
  registrationNumber!: string;

  @IsString()
  @MaxLength(2)
  country!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[]; // URLs to uploaded documents
}
