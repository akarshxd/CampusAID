import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateRatingDto } from './dto';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async rate(requestId: string, userId: string, dto: CreateRatingDto) {
    const request = await this.prisma.helpRequest.findUnique({
      where: { id: requestId },
      select: { status: true, requesterId: true, helperId: true },
    });

    // Only the two people involved may rate. Everyone else sees "not found".
    const involved =
      request &&
      (request.requesterId === userId || request.helperId === userId);
    if (!request || !involved) {
      throw new NotFoundException('Request not found');
    }
    if (request.status !== 'COMPLETED') {
      throw new ConflictException('You can only rate a completed task');
    }

    const rateeId =
      request.requesterId === userId ? request.helperId : request.requesterId;
    if (!rateeId) {
      throw new ConflictException('There is nobody to rate');
    }

    try {
      return await this.prisma.rating.create({
        data: {
          requestId,
          raterId: userId,
          rateeId,
          stars: dto.stars,
          comment: dto.comment,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('You already rated this task');
      }
      throw e;
    }
  }

  async summary(userId: string) {
    const agg = await this.prisma.rating.aggregate({
      where: { rateeId: userId },
      _avg: { stars: true },
      _count: { stars: true },
    });
    return {
      average: agg._avg.stars ? Math.round(agg._avg.stars * 10) / 10 : null,
      count: agg._count.stars,
    };
  }
}