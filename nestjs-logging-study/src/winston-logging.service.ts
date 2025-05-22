import { Injectable } from "@nestjs/common";
import logger from "./app.logger";

@Injectable()
export class WinstonLoggingService {
    doLogging(): string {
        logger.info("Default Logging Message");
        logger.error("Error Logging Message");
        logger.warn("Warning Logging Message");
        logger.debug("Debug Logging Message");

        return "Successfully winston logged messages";
    }
}