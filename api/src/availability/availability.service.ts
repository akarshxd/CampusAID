import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SetAvailabilityDto } from './dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async set(userId: string, dto: SetAvailabilityDto) {
    if (dto.isAvailable && (dto.lat == null || dto.lng == null)) {
      throw new BadRequestException(
        'Share your location (lat and lng) to mark yourself available',
      );
    }

    // When going unavailable, forget the location.
    const lat = dto.isAvailable ? dto.lat : null;
    const lng = dto.isAvailable ? dto.lng : null;

    return this.prisma.availability.upsert({
      where: { userId },
      create: { userId, isAvailable: dto.isAvailable, lat, lng },
      update: { isAvailable: dto.isAvailable, lat, lng },
    });
  }
}