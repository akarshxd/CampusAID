import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';
import { EventsModule } from './events/events.module';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RequestsModule,
    EventsModule,
    AvailabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}