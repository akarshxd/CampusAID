import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';

@Module({
  imports: [PrismaModule, AuthModule, RequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}