import { AppService } from './app.service';
import { WinstonLoggingService } from './winston-logging.service';
export declare class AppController {
    private readonly appService;
    private readonly winstonLoggingService;
    constructor(appService: AppService, winstonLoggingService: WinstonLoggingService);
    getHello(): string;
    getLogging(): string;
    getWinstonLogging(): string;
}
