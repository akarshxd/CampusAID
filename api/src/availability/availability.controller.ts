import { Body, Controller, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto } from './dto';

@Controller('availability')
@UseGuards(AuthGuard)
export class AvailabilityController {
  constructor(private availability: AvailabilityService) {}

  @Put()
  set(@Req() req: any, @Body() dto: SetAvailabilityDto) {
    return this.availability.set(req.user.sub, dto);
  }
}