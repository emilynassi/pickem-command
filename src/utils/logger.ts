import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.PICKEM_COMMAND_SERVICE || 'pickem-command',
    version: process.env.PICKEM_COMMAND_VERSION || '1.0.0',
    env: process.env.DD_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.json(),
    }),
  ],
});

export default logger;
