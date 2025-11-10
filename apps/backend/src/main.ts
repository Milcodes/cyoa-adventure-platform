import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('cors.origin'),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('v1');

  // Swagger/OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('CYOA Platform API')
    .setDescription('Choose Your Own Adventure Platform - RESTful API Documentation')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('stories', 'Story management endpoints')
    .addTag('gameplay', 'Gameplay and save game endpoints')
    .addTag('translation', 'Multi-language translation endpoints')
    .addTag('media', 'File upload and media management')
    .addTag('moderation', 'Story moderation and review workflow')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'CYOA Platform API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 36px; }
    `,
  });

  const port = configService.get<number>('port') || 4000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/v1`);
  console.log(`📚 API Docs (Swagger): http://localhost:${port}/api-docs`);
  console.log(`📖 OpenAPI JSON: http://localhost:${port}/api-docs-json`);
}
bootstrap();
