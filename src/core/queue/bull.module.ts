import { DynamicModule, Global, Module, Logger } from '@nestjs/common';
import { BullModule as NestBullModule } from '@nestjs/bullmq';
import { secrets } from '@core/config';

/**
 * Global BullMQ configuration module
 * Provides Redis connection for all queues in the application
 *
 * This module is automatically imported in AppModule
 * Feature modules should only use BullModule.registerQueue() to add their queues
 */
@Global()
@Module({})
export class BullConfigModule {
  private static readonly logger = new Logger(BullConfigModule.name);
  private static isRegistered = false;

  static forRoot(): DynamicModule {
    if (this.isRegistered) {
      this.logger.warn(
        'BullConfigModule.forRoot() called multiple times. Skipping duplicate registration.',
      );
      return {
        module: BullConfigModule,
        imports: [],
        exports: [],
      };
    }

    const redisConfig = secrets.redis;
    this.logger.log(
      `Initializing BullMQ with Redis at ${redisConfig.host}:${redisConfig.port}`,
    );

    this.isRegistered = true;

    return {
      module: BullConfigModule,
      imports: [
        NestBullModule.forRoot({
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            username: redisConfig.username || undefined,
            password: redisConfig.password || undefined,
          },
        }),
      ],
      exports: [NestBullModule],
    };
  }
}
