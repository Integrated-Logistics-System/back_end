import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectQueryDto,
} from "./dto/project.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "../common/types";

@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.projectsService.create(createProjectDto, req.user.userId);
  }

  @Get()
  async findAll(
    @Query() query: ProjectQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.projectsService.findAll(req.user.userId, query);
  }

  @Get("overview")
  async getUserProjects(@Request() req: AuthenticatedRequest) {
    return this.projectsService.getUserProjects(req.user.userId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.projectsService.findOne(id, req.user.userId);
  }

  @Get(":id/tasks")
  async getProjectTasks(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.projectsService.getProjectTasks(id, req.user.userId);
  }

  @Get(":id/stats")
  async getProjectStats(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.projectsService.getProjectStats(id, req.user.userId);
  }

  @Get(":id/insights")
  async getProjectInsights(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.projectsService.generateProjectInsights(id, req.user.userId);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.projectsService.update(id, updateProjectDto, req.user.userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.projectsService.remove(id, req.user.userId);
  }
}
