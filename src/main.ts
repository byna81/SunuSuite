import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Prefix API
  app.setGlobalPrefix('api/v1');

  // ✅ Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ✅ IMPORTANT pour mobile / frontend
  app.enableCors({
    origin: '*',
  });

  // ✅ Exposer les fichiers générés (PDF, etc.)
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // ✅ Port Railway
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}

bootstrap();
