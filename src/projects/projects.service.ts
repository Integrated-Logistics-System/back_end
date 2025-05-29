import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Project,
  ProjectDocument,
  ProjectStatus,
} from "./schemas/project.schema";
import { Task, TaskDocument, TaskStatus } from "../tasks/schemas/task.schema";
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectQueryDto,
} from "./dto/project.dto";
import { AiService } from "../ai/ai.service";
import { SearchService } from "../search/search.service";

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private aiService: AiService,
    private searchService: SearchService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<Project> {
    const projectData = {
      ...createProjectDto,
      userId: new Types.ObjectId(userId),
      collaborators:
        createProjectDto.collaborators?.map((id) => new Types.ObjectId(id)) ||
        [],
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        percentage: 0,
      },
    };

    const createdProject = new this.projectModel(projectData);
    const savedProject = await createdProject.save();

    // Index in Elasticsearch for search
    await this.searchService.indexProject(savedProject);

    return savedProject;
  }

  async findAll(userId: string, query: ProjectQueryDto): Promise<Project[]> {
    const filter: Record<string, any> = { userId: new Types.ObjectId(userId) };

    // Apply filters
    if (query.status) filter.status = query.status;
    if (query.isArchived !== undefined) filter.isArchived = query.isArchived;
    if (query.tags && query.tags.length > 0) filter.tags = { $in: query.tags };

    let projects: Project[];

    // Use Elasticsearch for text search, MongoDB for other queries
    if (query.search) {
      const searchResults = await this.searchService.searchProjects(
        query.search,
        userId,
        filter,
      );
      projects = searchResults as Project[];
    } else {
      projects = await this.projectModel
        .find(filter)
        .sort({ createdAt: -1 })
        .exec();
    }

    // Populate progress data for each project
    for (const project of projects) {
      const progress = await this.calculateProjectProgress(
        (project as any)._id?.toString() || (project as any).id?.toString(),
      );
      (project as any).progress = progress;
    }

    return projects;
  }

  async findOne(id: string, userId: string): Promise<Project> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid project ID");
    }

    const project = await this.projectModel
      .findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .populate("collaborators", "name email")
      .exec();

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    // Calculate and update progress
    project.progress = await this.calculateProjectProgress(id);

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    await this.findOne(id, userId); // Check if project exists and belongs to user

    const updateData = {
      ...updateProjectDto,
      collaborators: updateProjectDto.collaborators?.map(
        (id) => new Types.ObjectId(id),
      ),
    };

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("collaborators", "name email")
      .exec();

    if (!updatedProject) {
      throw new NotFoundException("Project not found");
    }

    // Update in Elasticsearch
    await this.searchService.indexProject(updatedProject);

    return updatedProject;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId); // Check if project exists and belongs to user

    // Check if project has any tasks
    const taskCount = await this.taskModel.countDocuments({
      projectId: new Types.ObjectId(id),
    });

    if (taskCount > 0) {
      throw new BadRequestException(
        "Cannot delete project with existing tasks. Please remove all tasks first.",
      );
    }

    await this.projectModel.findByIdAndDelete(id).exec();
  }

  async getProjectTasks(projectId: string, userId: string): Promise<Task[]> {
    await this.findOne(projectId, userId); // Check if project exists and belongs to user

    return this.taskModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getProjectStats(
    projectId: string,
    userId: string,
  ): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    upcomingDeadlines: Date[];
    completionPercentage: number;
    averageTaskCompletion: number; // days
    tasksByPriority: Record<string, number>;
    tasksByStatus: Record<string, number>;
  }> {
    await this.findOne(projectId, userId); // Check if project exists and belongs to user

    const tasks = await this.taskModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .exec();
    const now = new Date();

    const completedTasks = tasks.filter(
      (task) => task.status === TaskStatus.COMPLETED,
    );
    const overdueTasks = tasks.filter(
      (task) =>
        task.dueDate &&
        task.dueDate < now &&
        task.status !== TaskStatus.COMPLETED,
    );

    const upcomingDeadlines = tasks
      .filter(
        (task) =>
          task.dueDate &&
          task.dueDate > now &&
          task.status !== TaskStatus.COMPLETED,
      )
      .map((task) => task.dueDate!)
      .sort((a, b) => a.getTime() - b.getTime())
      .slice(0, 5);

    // Calculate average completion time
    const completedTasksWithDates = completedTasks.filter(
      (task) => task.completedAt && task.createdAt,
    );
    const averageTaskCompletion =
      completedTasksWithDates.length > 0
        ? completedTasksWithDates.reduce((sum, task) => {
            const diff =
              task.completedAt!.getTime() - task.createdAt!.getTime();
            return sum + diff / (1000 * 60 * 60 * 24); // Convert to days
          }, 0) / completedTasksWithDates.length
        : 0;

    const tasksByPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const tasksByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      upcomingDeadlines,
      completionPercentage:
        tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
      averageTaskCompletion: Math.round(averageTaskCompletion * 100) / 100,
      tasksByPriority,
      tasksByStatus,
    };
  }

  async generateProjectInsights(
    projectId: string,
    userId: string,
  ): Promise<{
    summary: string;
    risks: string[];
    suggestions: string[];
    estimatedCompletion?: Date;
  }> {
    const stats = await this.getProjectStats(projectId, userId);
    const tasks = await this.getProjectTasks(projectId, userId);

    const recentActivity = tasks
      .filter((task) => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return task.updatedAt && task.updatedAt > weekAgo;
      })
      .map((task) => `${task.status}: ${task.title}`);

    return this.aiService.generateProjectInsights({
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      overdueTasks: stats.overdueTasks,
      upcomingDeadlines: stats.upcomingDeadlines,
      recentActivity,
    });
  }

  async getUserProjects(userId: string): Promise<{
    active: Project[];
    completed: Project[];
    archived: Project[];
  }> {
    const allProjects = await this.projectModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();

    const active = allProjects.filter(
      (p) =>
        p.status === ProjectStatus.ACTIVE ||
        p.status === ProjectStatus.PLANNING,
    );
    const completed = allProjects.filter(
      (p) => p.status === ProjectStatus.COMPLETED,
    );
    const archived = allProjects.filter((p) => p.isArchived);

    return { active, completed, archived };
  }

  private async calculateProjectProgress(projectId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    percentage: number;
  }> {
    const totalTasks = await this.taskModel.countDocuments({
      projectId: new Types.ObjectId(projectId),
    });

    const completedTasks = await this.taskModel.countDocuments({
      projectId: new Types.ObjectId(projectId),
      status: TaskStatus.COMPLETED,
    });

    const percentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { totalTasks, completedTasks, percentage };
  }

  async updateProjectProgress(projectId: string): Promise<void> {
    const progress = await this.calculateProjectProgress(projectId);

    await this.projectModel
      .findByIdAndUpdate(projectId, {
        progress,
        ...(progress.percentage === 100 && { status: ProjectStatus.COMPLETED }),
      })
      .exec();
  }
}
