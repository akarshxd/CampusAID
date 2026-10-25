import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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

  @Post(':id/accept')
  accept(@Req() req: any, @Param('id') id: string) {
    return this.requests.accept(id, req.user.sub, req.user.campusId);
  }

  @Get(':id/handover-code')
  handoverCode(@Req() req: any, @Param('id') id: string) {
    return this.requests.getHandoverCode(id, req.user.sub);
  }

  @Post(':id/start')
  start(@Req() req: any, @Param('id') id: string) {
    return this.requests.start(id, req.user.sub);
  }

  @Post(':id/complete')
  complete(
    @Req() req: any,
    @Param('id') id: string,
    @Body('code') code: unknown,
  ) {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new BadRequestException('Enter the 6-digit handover code');
    }
    return this.requests.complete(id, req.user.sub, code);
  }
}