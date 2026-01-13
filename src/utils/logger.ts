import { Request } from "express";
import { ConfigService } from '@nestjs/config';

function getLogLevel(configService: ConfigService): string {
  const env = configService.get('NODE_ENV', 'development');
  return env === "production" ? "info" : "debug";
}

export const getLoggerConfig = (env: ConfigService) => {
  const isDevelopment = env.get('NODE_ENV') !== 'production';

  return {
    pinoHttp: {
      level: getLogLevel(env),
      ...(isDevelopment && {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
      serializers: {
        req: (req: Request) => {
          const forwardedFor = req.headers['x-forwarded-for'];
          const ip = req.ip
            || (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : undefined)
            || req.headers['x-real-ip'] as string
            || 'unknown';

          return {
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            ip,
          };
        },
        err: (err) => ({
          type: err.type,
          message: err.message,
          stack: err.stack,
        }),
      },
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
          return 'warn';
        } else if (res.statusCode >= 500 || err) {
          return 'error';
        }
        return 'info';
      },
    },
  };
};