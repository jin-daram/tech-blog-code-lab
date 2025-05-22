import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WinstonLoggingService } from './winston-logging.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, WinstonLoggingService],
})
export class AppModule {}
