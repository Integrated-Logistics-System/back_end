import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
import { Project, ProjectSchema } from "./schemas/project.schema";
import { TasksModule } from "../tasks/tasks.module";
import { AiModule } from "../ai/ai.module";
import { SearchModule } from "../search/search.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    TasksModule,
    AiModule,
    SearchModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
