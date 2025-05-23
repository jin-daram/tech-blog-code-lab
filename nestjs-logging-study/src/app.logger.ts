import { createLogger, format } from "winston";
import LokiTransport from "winston-loki";

/*
const logger = createLogger({
    level: 'info',
    format: format.combine( 
        format.timestamp(),
        format.printf(({ level, message, timestamp }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        }),
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/combined.log' }),
        new transports.File({ filename: 'logs/error.log', level: 'error'}),
    ]
})
*/

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new LokiTransport({
            host: 'http://localhost:3100',
            labels: { app: 'test-app', env: 'local' },
            json: true,
            replaceTimestamp: true,
        }),
    ],
});

export default logger;