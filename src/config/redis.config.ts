import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullRootModuleOptions } from "@nestjs/bull";

export const redisConfig = () => ({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService): BullRootModuleOptions => ({
    redis: {
      host: configService.get<string>("REDIS_HOST") || "localhost",
      port: configService.get<number>("REDIS_PORT") || 6379,
      password: configService.get<string>("REDIS_PASSWORD"),
    },
    prefix: configService.get<string>("QUEUE_PREFIX") || "taskmind-ai-queue",
  }),
  inject: [ConfigService],
});
