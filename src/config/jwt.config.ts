import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModuleAsyncOptions } from "@nestjs/jwt";

export const jwtConfig = (): JwtModuleAsyncOptions => ({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>("JWT_SECRET"),
    signOptions: {
      expiresIn: configService.get<string>("JWT_EXPIRES_IN"),
    },
  }),
  inject: [ConfigService],
});
