import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { WinstonLoggingService } from './winston-logging.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly winstonLoggingService: WinstonLoggingService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("/logging")
  getLogging(): string {
    return this.appService.defaultLogging();
  }

  @Get("/logging/winston")
  getWinstonLogging(): string {
    return this.winstonLoggingService.doLogging();
  }

}