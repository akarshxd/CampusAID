import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CreateRatingDto } from './dto';
import { RatingsService } from './ratings.service';

@Controller()
@UseGuards(AuthGuard)
export class RatingsController {
  constructor(private ratings: RatingsService) {}

  @Post('requests/:id/rate')
  rate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratings.rate(id, req.user.sub, dto);
  }

  @Get('ratings/me')
  mine(@Req() req: any) {
    return this.ratings.summary(req.user.sub);
  }
}