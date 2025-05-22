import { Injectable, Logger } from '@nestjs/common';


@Injectable()
export class AppService {

  logger = new Logger(AppService.name);

  getHello(): string {
    return 'Hello World!!!!';
  }

  defaultLogging(): string {
    this.logger.log("Default Logging Message");
    this.logger.error("Error Logging Message");
    this.logger.warn("Warning Logging Message");
    this.logger.debug("Debug Logging Message");

    return "Successfully logged messages";
  }
  
}