import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ElasticsearchModule } from "@nestjs/elasticsearch";
import { BullModule } from "@nestjs/bull";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { TasksModule } from "./tasks/tasks.module";
import { ProjectsModule } from "./projects/projects.module";
import { AiModule } from "./ai/ai.module";
import { SearchModule } from "./search/search.module";
import { databaseConfig } from "./config/database.config";
import { elasticsearchConfig } from "./config/elasticsearch.config";
import { redisConfig } from "./config/redis.config";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Database
    MongooseModule.forRootAsync(databaseConfig()),

    // Elasticsearch
    ElasticsearchModule.registerAsync(elasticsearchConfig()),

    // Redis/Bull Queue
    BullModule.forRootAsync(redisConfig()),

    // Feature Modules
    AuthModule,
    UsersModule,
    TasksModule,
    ProjectsModule,
    AiModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
