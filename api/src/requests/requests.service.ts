import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma.service';
import { CreateRequestDto } from './dto';

const NEARBY_RADIUS_METERS = 500;

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  // Counts available helpers on the same campus within the radius of a point.
  private async countNearbyHelpers(
    campusId: string,
    excludeUserId: string,
    lat: number,
    lng: number,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM "Availability" a
      JOIN "User" u ON u."id" = a."userId"
      WHERE a."isAvailable" = true
        AND a."lat" IS NOT NULL
        AND a."lng" IS NOT NULL
        AND u."campusId" = ${campusId}
        AND u."id" <> ${excludeUserId}
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(a."lng", a."lat"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
          ${NEARBY_RADIUS_METERS}::float8
        )
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async create(userId: string, campusId: string, dto: CreateRequestDto) {
    const created = await this.prisma.helpRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        pickup: dto.pickup,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoff: dto.dropoff,
        reward: dto.reward,
        neededBy: dto.neededBy ? new Date(dto.neededBy) : null,
        requesterId: userId,
        campusId,
      },
      include: { requester: { select: { id: true, name: true } } },
    });

    this.events.emitToCampus(campusId, 'request:created', created);

    let nearbyHelpers: number | null = null;
    if (dto.pickupLat != null && dto.pickupLng != null) {
      nearbyHelpers = await this.countNearbyHelpers(
        campusId,
        userId,
        dto.pickupLat,
        dto.pickupLng,
      );
    }
    return { ...created, nearbyHelpers };
  }

  listOpen(campusId: string) {
    return this.prisma.helpRequest.findMany({
      where: { campusId, status: 'REQUESTED' },
      orderBy: { createdAt: 'desc' },
      include: { requester: { select: { id: true, name: true } } },
    });
  }

  async accept(requestId: string, userId: string, campusId: string) {
    // One atomic step: only succeeds while the request is still REQUESTED.
    const result = await this.prisma.helpRequest.updateMany({
      where: {
        id: requestId,
        campusId,
        status: 'REQUESTED',
        requesterId: { not: userId },
      },
      data: {
        status: 'ACCEPTED',
        helperId: userId,
        acceptedAt: new Date(),
      },
    });

    if (result.count === 1) {
      const accepted = await this.prisma.helpRequest.findUnique({
        where: { id: requestId },
        include: {
          requester: { select: { id: true, name: true } },
          helper: { select: { id: true, name: true } },
        },
      });

      this.events.emitToCampus(campusId, 'request:taken', {
        id: requestId,
        helper: accepted?.helper,
      });
      return accepted;
    }

    // We lost (or never had a chance). Work out why, to give a clear answer.
    const existing = await this.prisma.helpRequest.findUnique({
      where: { id: requestId },
    });
    if (!existing || existing.campusId !== campusId) {
      throw new NotFoundException('Request not found');
    }
    if (existing.requesterId === userId) {
      throw new ForbiddenException('You cannot accept your own request');
    }
    throw new ConflictException('This request is no longer available');
  }
}