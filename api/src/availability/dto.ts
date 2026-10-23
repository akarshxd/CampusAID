import { IsBoolean, IsLatitude, IsLongitude, IsOptional } from 'class-validator';

export class SetAvailabilityDto {
  @IsBoolean()
  isAvailable: boolean;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}