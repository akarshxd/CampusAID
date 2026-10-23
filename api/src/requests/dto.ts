import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(2)
  pickup: string;

  @IsString()
  @MinLength(2)
  dropoff: string;

  @IsInt()
  @Min(0)
  @Max(5000)
  reward: number;

  @IsOptional()
  @IsDateString()
  neededBy?: string;
}