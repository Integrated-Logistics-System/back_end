import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Task, TaskDocument, TaskStatus } from "./schemas/task.schema";
import {
  CreateTaskDto,
  CreateTaskFromNaturalLanguageDto,
  UpdateTaskDto,
  TaskQueryDto,
} from "./dto/task.dto";
import { AiService } from "../ai/ai.service";
import { SearchService } from "../search/search.service";

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private aiService: AiService,
    private searchService: SearchService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    const taskData = {
      ...createTaskDto,
      userId: new Types.ObjectId(userId),
      projectId: createTaskDto.projectId
        ? new Types.ObjectId(createTaskDto.projectId)
        : undefined,
    };

    const createdTask = new this.taskModel(taskData);
    const savedTask = await createdTask.save();

    // Index in Elasticsearch for search
    await this.searchService.indexTask(savedTask);

    return savedTask;
  }

  async createFromNaturalLanguage(
    createTaskDto: CreateTaskFromNaturalLanguageDto,
    userId: string,
  ): Promise<Task | { task: any; needsConfirmation: boolean; suggestions: string[] }> {
    // Parse natural language input using AI with LangGraph
    const parsedData = await this.aiService.parseNaturalLanguageTask(
      createTaskDto.input,
    );

    // LangGraph 워크플로우 결과에 따른 분기 처리
    if (parsedData.confidence < 0.6) {
      return {
        task: parsedData,
        needsConfirmation: true,
        suggestions: [
          "작업 내용을 더 구체적으로 입력해주세요.",
          "마감일이나 우선순위를 명시해보세요.",
        ],
      };
    }

    if (parsedData.priority === TaskPriority.URGENT && parsedData.confidence < 0.8) {
      return {
        task: parsedData,
        needsConfirmation: true,
        suggestions: [
          "긴급한 작업입니다. 내용을 다시 한번 확인해주세요.",
          "마감일과 담당자를 명확히 해주세요.",
        ],
      };
    }

    const taskData = {
      title: parsedData.title,
      description: parsedData.description,
      userId: new Types.ObjectId(userId),
      projectId: createTaskDto.projectId
        ? new Types.ObjectId(createTaskDto.projectId)
        : undefined,
      priority: parsedData.priority,
      dueDate: parsedData.dueDate,
      tags: parsedData.tags,
      originalInput: createTaskDto.input,
      aiMetadata: {
        extractedEntities: parsedData.extractedEntities,
        suggestedPriority: parsedData.priority,
        estimatedDuration: parsedData.estimatedDuration,
        confidence: parsedData.confidence,
      },
    };

    const createdTask = new this.taskModel(taskData);
    const savedTask = await createdTask.save();

    // Index in Elasticsearch for search
    await this.searchService.indexTask(savedTask);

    return savedTask;
  }

  async findAll(userId: string, query: TaskQueryDto): Promise<Task[]> {
    const filter: Record<string, any> = { userId: new Types.ObjectId(userId) };

    // Apply filters
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.isArchived !== undefined) filter.isArchived = query.isArchived;
    if (query.tags && query.tags.length > 0) filter.tags = { $in: query.tags };

    // Date filters
    if (query.dueBefore || query.dueAfter) {
      filter.dueDate = {};
      if (query.dueBefore) filter.dueDate.$lte = new Date(query.dueBefore);
      if (query.dueAfter) filter.dueDate.$gte = new Date(query.dueAfter);
    }

    let tasks: Task[];

    // Use Elasticsearch for text search, MongoDB for other queries
    if (query.search) {
      const searchResults = await this.searchService.searchTasks(
        query.search,
        userId,
        filter,
      );
      tasks = searchResults as Task[];
    } else {
      tasks = await this.taskModel
        .find(filter)
        .populate("projectId", "name color")
        .sort({ createdAt: -1 })
        .exec();
    }

    return tasks;
  }

  async findOne(id: string, userId: string): Promise<Task> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid task ID");
    }

    const task = await this.taskModel
      .findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .populate("projectId", "name color")
      .exec();

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(id, userId);

    // Handle status change to completed
    if (
      updateTaskDto.status === TaskStatus.COMPLETED &&
      task.status !== TaskStatus.COMPLETED
    ) {
      (updateTaskDto as any).completedAt = new Date();
    }

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateTaskDto, { new: true })
      .populate("projectId", "name color")
      .exec();

    if (!updatedTask) {
      throw new NotFoundException("Task not found after update");
    }

    // Update in Elasticsearch
    await this.searchService.updateTask(updatedTask);

    return updatedTask;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId); // Verify ownership

    await this.taskModel.findByIdAndDelete(id).exec();

    // Remove from Elasticsearch
    await this.searchService.deleteTask(id);
  }

  async getTasksByDueDate(userId: string, dueDate: Date): Promise<Task[]> {
    const startOfDay = new Date(dueDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dueDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.taskModel
      .find({
        userId: new Types.ObjectId(userId),
        dueDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: TaskStatus.COMPLETED },
      })
      .populate("projectId", "name color")
      .sort({ priority: -1, dueDate: 1 })
      .exec();
  }

  async getOverdueTasks(userId: string): Promise<Task[]> {
    const now = new Date();

    return this.taskModel
      .find({
        userId: new Types.ObjectId(userId),
        dueDate: { $lt: now },
        status: { $ne: TaskStatus.COMPLETED },
        isArchived: false,
      })
      .populate("projectId", "name color")
      .sort({ dueDate: 1 })
      .exec();
  }

  async getUpcomingTasks(userId: string, days: number = 7): Promise<Task[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.taskModel
      .find({
        userId: new Types.ObjectId(userId),
        dueDate: { $gte: now, $lte: futureDate },
        status: { $ne: TaskStatus.COMPLETED },
        isArchived: false,
      })
      .populate("projectId", "name color")
      .sort({ dueDate: 1, priority: -1 })
      .exec();
  }

  async getTaskStats(userId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const tasks = await this.taskModel
      .find({ userId: new Types.ObjectId(userId), isArchived: false })
      .exec();

    const now = new Date();
    const overdueTasks = tasks.filter(
      (task) =>
        task.dueDate &&
        task.dueDate < now &&
        task.status !== TaskStatus.COMPLETED,
    );

    const byPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const byStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: tasks.length,
      completed: tasks.filter((task) => task.status === TaskStatus.COMPLETED)
        .length,
      pending: tasks.filter((task) => task.status !== TaskStatus.COMPLETED)
        .length,
      overdue: overdueTasks.length,
      byPriority,
      byStatus,
    };
  }

  async suggestPriority(
    id: string,
    userId: string,
  ): Promise<{ priority: string; reasoning: string }> {
    const task = await this.findOne(id, userId);

    return this.aiService.suggestTaskPriority({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      tags: task.tags,
    });
  }

  async bulkUpdate(
    taskIds: string[],
    updateData: Partial<UpdateTaskDto>,
    userId: string,
  ): Promise<Task[]> {
    const objectIds = taskIds.map((id) => new Types.ObjectId(id));

    await this.taskModel
      .updateMany(
        { _id: { $in: objectIds }, userId: new Types.ObjectId(userId) },
        updateData,
      )
      .exec();

    return this.taskModel
      .find({ _id: { $in: objectIds } })
      .populate("projectId", "name color")
      .exec();
  }
}
