import winston from 'winston';
import { LogLevel } from '../types/index.js';

const { format, transports } = winston;

export function createLogger(level: LogLevel = 'info', id?: string): winston.Logger {
    const logFormat = format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack, ...meta }) => {
            const prefix = id ? `[${id}] ` : '';
            let log = `${timestamp} ${prefix}${level}: ${message}`;

            // Add metadata if present
            if (Object.keys(meta).length > 0) {
                log += ` ${JSON.stringify(meta)}`;
            }

            // Add stack trace if present
            if (stack) {
                log += `\n${stack}`;
            }

            return log;
        })
    );

    // Mask sensitive information
    const maskSensitiveInfo = format(info => {
        const sensitive = ['password', 'passphrase', 'privateKey', 'DB_PASSWORD'];

        if (typeof info.message === 'string') {
            let maskedMessage = info.message;
            sensitive.forEach(key => {
                const regex = new RegExp(`(${key}[=:\\s]+)([^\\s&]+)`, 'gi');
                maskedMessage = maskedMessage.replace(regex, '$1***MASKED***');
            });
            info.message = maskedMessage;
        }

        return info;
    });

    return winston.createLogger({
        level,
        format: format.combine(maskSensitiveInfo(), logFormat),
        transports: [
            new transports.Console({
                stderrLevels: ['error', 'warn', 'info', 'debug'],
            }),
        ],
    });
}
