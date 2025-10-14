// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('🚀 Starting Smart Farm Backend...');
    
    // Add a small delay to allow database to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    // ✅ Security headers
    app.use(helmet({
      contentSecurityPolicy: false, // CSP is managed at the frontend/nginx layer
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use(cookieParser());

    // ✅ Global exception filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // ✅ Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // ✅ Global prefix for all routes
    app.setGlobalPrefix('api/v1');

    // ✅ Allow requests from your frontend
    app.enableCors({
      origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN?.split(',') || ['http://127.0.0.1:4200', 'http://localhost:4200'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
    
    logger.log(`🚀 Smart Farm Backend is running on: http://localhost:${port}/api/v1`);
    logger.log(`📊 Health check: http://localhost:${port}/api/v1/health`);
    logger.log(`🔧 API Documentation: http://localhost:${port}/api/v1`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🗄️ Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
    logger.log(`🔌 MQTT Broker: ${process.env.MQTT_BROKER || 'Not set'}`);
    
  } catch (error) {
    logger.error('❌ Failed to start Smart Farm Backend:', error);
    logger.error('Error details:', error.message);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
