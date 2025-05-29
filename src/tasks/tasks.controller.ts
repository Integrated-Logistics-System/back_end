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
import { TasksService } from "./tasks.service";
import {
  CreateTaskDto,
  CreateTaskFromNaturalLanguageDto,
  UpdateTaskDto,
  TaskQueryDto,
} from "./dto/task.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "../common/types";

@Controller("tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.create(createTaskDto, req.user.userId);
  }

  @Post("natural-language")
  @HttpCode(HttpStatus.CREATED)
  async createFromNaturalLanguage(
    @Body() createTaskDto: CreateTaskFromNaturalLanguageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.createFromNaturalLanguage(
      createTaskDto,
      req.user.userId,
    );
  }

  @Get()
  async findAll(
    @Query() query: TaskQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.findAll(req.user.userId, query);
  }

  @Get("stats")
  async getStats(@Request() req: AuthenticatedRequest) {
    return this.tasksService.getTaskStats(req.user.userId);
  }

  @Get("due-today")
  async getDueTodayTasks(@Request() req: AuthenticatedRequest) {
    const today = new Date();
    return this.tasksService.getTasksByDueDate(req.user.userId, today);
  }

  @Get("overdue")
  async getOverdueTasks(@Request() req: AuthenticatedRequest) {
    return this.tasksService.getOverdueTasks(req.user.userId);
  }

  @Get("upcoming")
  async getUpcomingTasks(
    @Query("days") days: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const daysCount = days ? parseInt(days, 10) : 7;
    return this.tasksService.getUpcomingTasks(req.user.userId, daysCount);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.tasksService.findOne(id, req.user.userId);
  }

  @Get(":id/suggest-priority")
  async suggestPriority(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.suggestPriority(id, req.user.userId);
  }

  @Patch("bulk")
  async bulkUpdate(
    @Body() body: { taskIds: string[]; updateData: UpdateTaskDto },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.bulkUpdate(
      body.taskIds,
      body.updateData,
      req.user.userId,
    );
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user.userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string, @Request() req: AuthenticatedRequest) {
    return this.tasksService.remove(id, req.user.userId);
  }
}
