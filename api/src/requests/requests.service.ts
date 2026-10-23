import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRequestDto } from './dto';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, campusId: string, dto: CreateRequestDto) {
    return this.prisma.helpRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        pickup: dto.pickup,
        dropoff: dto.dropoff,
        reward: dto.reward,
        neededBy: dto.neededBy ? new Date(dto.neededBy) : null,
        requesterId: userId,
        campusId,
      },
    });
  }

  listOpen(campusId: string) {
    return this.prisma.helpRequest.findMany({
      where: { campusId, status: 'REQUESTED' },
      orderBy: { createdAt: 'desc' },
      include: { requester: { select: { id: true, name: true } } },
    });
  }
}