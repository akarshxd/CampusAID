import {
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
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

  @IsOptional()
  @IsLatitude()
  pickupLat?: number;

  @IsOptional()
  @IsLongitude()
  pickupLng?: number;

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