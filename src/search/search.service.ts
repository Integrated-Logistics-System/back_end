import { Injectable, Logger } from "@nestjs/common";

// Task and Project interfaces for indexing
interface TaskForIndexing {
  _id?: any;
  id?: any;
  title: string;
  description?: string;
  tags: string[];
  status: string;
  priority: string;
  userId: any;
  projectId?: any;
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  originalInput?: string;
  aiMetadata?: any;
}

interface ProjectForIndexing {
  _id?: any;
  id?: any;
  name: string;
  description?: string;
  tags: string[];
  status: string;
  userId: any;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor() {}

  async onModuleInit() {
    this.logger.log("Search service initialized (Elasticsearch disabled)");
  }

  async indexTask(task: TaskForIndexing): Promise<void> {
    this.logger.debug(`Task ${task._id || task.id} indexing skipped (Elasticsearch disabled)`);
  }

  async updateTask(task: TaskForIndexing): Promise<void> {
    this.logger.debug(`Task ${task._id || task.id} update skipped (Elasticsearch disabled)`);
  }

  async deleteTask(taskId: string): Promise<void> {
    this.logger.debug(`Task ${taskId} deletion skipped (Elasticsearch disabled)`);
  }

  async searchTasks(
    query: string,
    userId: string,
    filters: Record<string, string> = {},
  ): Promise<any[]> {
    this.logger.debug("Task search skipped (Elasticsearch disabled)");
    return [];
  }

  async indexProject(project: ProjectForIndexing): Promise<void> {
    this.logger.debug(`Project ${project._id || project.id} indexing skipped (Elasticsearch disabled)`);
  }

  async searchProjects(
    query: string,
    userId: string,
    filters: Record<string, string> = {},
  ): Promise<any[]> {
    this.logger.debug("Project search skipped (Elasticsearch disabled)");
    return [];
  }

  async searchAll(
    query: string,
    userId: string,
  ): Promise<{
    tasks: any[];
    projects: any[];
  }> {
    return { tasks: [], projects: [] };
  }

  async getSuggestions(query: string, userId: string): Promise<string[]> {
    return [];
  }

  async reindexAllTasks(tasks: TaskForIndexing[]): Promise<void> {
    this.logger.log("Task reindexing skipped (Elasticsearch disabled)");
  }

  async reindexAllProjects(projects: ProjectForIndexing[]): Promise<void> {
    this.logger.log("Project reindexing skipped (Elasticsearch disabled)");
  }
}
