/**
 * Logger Utility
 * Centralized logging with different levels
 */

import winston from 'winston';

class Logger {
    constructor(module = 'App') {
        this.module = module;
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ timestamp, level, message, stack }) => {
                    const logMessage = `${timestamp} [${this.module}] [${level.toUpperCase()}] ${message}`;
                    return stack ? `${logMessage}\n${stack}` : logMessage;
                })
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
                }),
            ],
        });

        // Add file transport in production
        if (process.env.NODE_ENV === 'production' && process.env.LOG_FILE) {
            this.logger.add(
                new winston.transports.File({
                    filename: process.env.LOG_FILE,
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                })
            );
        }
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    error(message, error = null) {
        if (error instanceof Error) {
            this.logger.error(message, { error: error.message, stack: error.stack });
        } else {
            this.logger.error(message, error);
        }
    }
}

export default Logger;
