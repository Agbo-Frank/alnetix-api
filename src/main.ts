import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { AppConfigService } from './utils/env';
import { ValidationExceptionFilter } from './utils';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true, // Buffer logs until Pino is ready
      logger: false, // Disable default logger to use Pino exclusively
    });

    app.useLogger(app.get(Logger));

    app.useGlobalFilters(new ValidationExceptionFilter());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const env = app.get(AppConfigService);
    const logger = app.get(Logger);

    app.enableCors({
      origin: env.whitelistedOrigins,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    const port = env.port || process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    console.error(error, 'Failed to start application');
    process.exit(1);
  }
}
bootstrap();
