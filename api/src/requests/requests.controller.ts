import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CreateRequestDto } from './dto';
import { RequestsService } from './requests.service';

@Controller('requests')
@UseGuards(AuthGuard)
export class RequestsController {
  constructor(private requests: RequestsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateRequestDto) {
    return this.requests.create(req.user.sub, req.user.campusId, dto);
  }

  @Get()
  list(@Req() req: any) {
    return this.requests.listOpen(req.user.campusId);
  }
}