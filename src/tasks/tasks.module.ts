import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TasksService } from "./tasks.service";
import { TasksController } from "./tasks.controller";
import { Task, TaskSchema } from "./schemas/task.schema";
import { AiModule } from "../ai/ai.module";
import { SearchModule } from "../search/search.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    AiModule,
    SearchModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService, MongooseModule],
})
export class TasksModule {}
