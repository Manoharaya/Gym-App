import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logger/logger.service';

async function bootstrap() {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, {
    logger,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);
  const corsOrigins = configService.get<string[]>('cors.origins', ['http://localhost:3000']);

  // Global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  // Enable CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-organisation-id', 'x-outlet-id'],
    exposedHeaders: ['x-request-id'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FitCore Platform API')
    .setDescription(
      'Multi-Tenant Fitness SaaS Enterprise API Foundation — Second Wind Athletic Club & Multi-Outlet Architecture',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-organisation-id',
        in: 'header',
        description: 'Tenant organization identifier',
      },
      'x-organisation-id',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-outlet-id',
        in: 'header',
        description: 'Tenant outlet/branch identifier',
      },
      'x-outlet-id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`FitCore API running on http://localhost:${port}/api/v1`, 'Bootstrap');
  logger.log(`Swagger OpenAPI documentation available at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
