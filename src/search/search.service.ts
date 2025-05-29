import { Injectable, Logger } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";

// Elasticsearch response types
interface ElasticsearchHit {
  _id: string;
  _source: any;
  _score: number;
}

interface ElasticsearchResponse {
  hits: {
    hits: ElasticsearchHit[];
  };
  suggest?: {
    [key: string]: Array<{
      options: Array<{ text: string }>;
    }>;
  };
}

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
  private readonly taskIndex = "tasks";
  private readonly projectIndex = "projects";

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async onModuleInit() {
    await this.createIndices();
  }

  private async createIndices() {
    try {
      // Create tasks index
      const taskIndexExists = await this.elasticsearchService.indices.exists({
        index: this.taskIndex,
      });

      if (!taskIndexExists) {
        await this.elasticsearchService.indices.create({
          index: this.taskIndex,
          body: {
            mappings: {
              properties: {
                title: { type: "text", analyzer: "standard" },
                description: { type: "text", analyzer: "standard" },
                tags: { type: "keyword" },
                status: { type: "keyword" },
                priority: { type: "keyword" },
                userId: { type: "keyword" },
                projectId: { type: "keyword" },
                dueDate: { type: "date" },
                createdAt: { type: "date" },
                updatedAt: { type: "date" },
                originalInput: { type: "text", analyzer: "standard" },
                "aiMetadata.extractedEntities.people": { type: "keyword" },
                "aiMetadata.extractedEntities.places": { type: "keyword" },
                "aiMetadata.extractedEntities.organizations": {
                  type: "keyword",
                },
              },
            },
          },
        });
        this.logger.log("Tasks index created successfully");
      }

      // Create projects index
      const projectIndexExists = await this.elasticsearchService.indices.exists(
        {
          index: this.projectIndex,
        },
      );

      if (!projectIndexExists) {
        await this.elasticsearchService.indices.create({
          index: this.projectIndex,
          body: {
            mappings: {
              properties: {
                name: { type: "text", analyzer: "standard" },
                description: { type: "text", analyzer: "standard" },
                tags: { type: "keyword" },
                status: { type: "keyword" },
                userId: { type: "keyword" },
                createdAt: { type: "date" },
                updatedAt: { type: "date" },
              },
            },
          },
        });
        this.logger.log("Projects index created successfully");
      }
    } catch (error) {
      this.logger.error("Failed to create Elasticsearch indices:", error);
    }
  }

  async indexTask(task: TaskForIndexing): Promise<void> {
    try {
      const taskId = task._id?.toString() || task.id?.toString();
      if (!taskId) {
        this.logger.error("Task ID is required for indexing");
        return;
      }

      await this.elasticsearchService.index({
        index: this.taskIndex,
        id: taskId,
        body: {
          title: task.title,
          description: task.description,
          tags: task.tags,
          status: task.status,
          priority: task.priority,
          userId: task.userId.toString(),
          projectId: task.projectId?.toString(),
          dueDate: task.dueDate,
          createdAt: task.createdAt || new Date(),
          updatedAt: task.updatedAt || new Date(),
          originalInput: task.originalInput,
          aiMetadata: task.aiMetadata,
        },
      });
      this.logger.debug(`Task ${taskId} indexed successfully`);
    } catch (error) {
      this.logger.error(`Failed to index task ${task._id || task.id}:`, error);
    }
  }

  async updateTask(task: TaskForIndexing): Promise<void> {
    try {
      const taskId = task._id?.toString() || task.id?.toString();
      if (!taskId) {
        this.logger.error("Task ID is required for updating");
        return;
      }

      await this.elasticsearchService.update({
        index: this.taskIndex,
        id: taskId,
        body: {
          doc: {
            title: task.title,
            description: task.description,
            tags: task.tags,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            updatedAt: new Date(),
            aiMetadata: task.aiMetadata,
          },
        },
      });
      this.logger.debug(`Task ${taskId} updated in search index`);
    } catch (error) {
      this.logger.error(
        `Failed to update task ${task._id || task.id} in search index:`,
        error,
      );
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: this.taskIndex,
        id: taskId,
      });
      this.logger.debug(`Task ${taskId} deleted from search index`);
    } catch (error) {
      this.logger.error(
        `Failed to delete task ${taskId} from search index:`,
        error,
      );
    }
  }

  async searchTasks(
    query: string,
    userId: string,
    filters: Record<string, string> = {},
  ): Promise<any[]> {
    try {
      const searchQuery = {
        index: this.taskIndex,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ["title^2", "description", "tags", "originalInput"],
                    type: "best_fields",
                    fuzziness: "AUTO",
                  },
                },
                {
                  term: { userId },
                },
              ],
              filter: this.buildFilters(filters),
            },
          },
          sort: [
            { _score: { order: "desc" } },
            { createdAt: { order: "desc" } },
          ],
          size: 50,
        },
      };

      const response = (await this.elasticsearchService.search(
        searchQuery,
      )) as ElasticsearchResponse;
      return response.hits.hits.map((hit: ElasticsearchHit) => ({
        _id: hit._id,
        ...hit._source,
        _score: hit._score,
      }));
    } catch (error) {
      this.logger.error("Failed to search tasks:", error);
      return [];
    }
  }

  async indexProject(project: ProjectForIndexing): Promise<void> {
    try {
      const projectId = project._id?.toString() || project.id?.toString();
      if (!projectId) {
        this.logger.error("Project ID is required for indexing");
        return;
      }

      await this.elasticsearchService.index({
        index: this.projectIndex,
        id: projectId,
        body: {
          name: project.name,
          description: project.description,
          tags: project.tags,
          status: project.status,
          userId: project.userId.toString(),
          createdAt: project.createdAt || new Date(),
          updatedAt: project.updatedAt || new Date(),
        },
      });
      this.logger.debug(`Project ${projectId} indexed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to index project ${project._id || project.id}:`,
        error,
      );
    }
  }

  async searchProjects(
    query: string,
    userId: string,
    filters: Record<string, string> = {},
  ): Promise<any[]> {
    try {
      const searchQuery = {
        index: this.projectIndex,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ["name^2", "description", "tags"],
                    type: "best_fields",
                    fuzziness: "AUTO",
                  },
                },
                {
                  term: { userId },
                },
              ],
              filter: this.buildFilters(filters),
            },
          },
          sort: [
            { _score: { order: "desc" } },
            { createdAt: { order: "desc" } },
          ],
          size: 20,
        },
      };

      const response = (await this.elasticsearchService.search(
        searchQuery,
      )) as ElasticsearchResponse;
      return response.hits.hits.map((hit: ElasticsearchHit) => ({
        _id: hit._id,
        ...hit._source,
        _score: hit._score,
      }));
    } catch (error) {
      this.logger.error("Failed to search projects:", error);
      return [];
    }
  }

  async searchAll(
    query: string,
    userId: string,
  ): Promise<{
    tasks: any[];
    projects: any[];
  }> {
    const [tasks, projects] = await Promise.all([
      this.searchTasks(query, userId),
      this.searchProjects(query, userId),
    ]);

    return { tasks, projects };
  }

  async getSuggestions(query: string, userId: string): Promise<string[]> {
    try {
      const searchQuery = {
        index: [this.taskIndex, this.projectIndex],
        body: {
          suggest: {
            task_suggest: {
              prefix: query,
              completion: {
                field: "suggest",
                size: 5,
                contexts: {
                  userId: [userId],
                },
              },
            },
          },
        },
      };

      const response = await this.elasticsearchService.search(searchQuery);
      const suggestions = response.suggest as any;
      if (
        suggestions &&
        suggestions.task_suggest &&
        Array.isArray(suggestions.task_suggest[0]?.options)
      ) {
        return suggestions.task_suggest[0].options.map(
          (option: any) => option.text as string,
        );
      }
      return [];
    } catch (error) {
      this.logger.error("Failed to get search suggestions:", error);
      return [];
    }
  }

  private buildFilters(filters: Record<string, any>): any[] {
    const esFilters: any[] = [];

    if (filters.status) {
      esFilters.push({ term: { status: filters.status } });
    }

    if (filters.priority) {
      esFilters.push({ term: { priority: filters.priority } });
    }

    if (filters.projectId) {
      esFilters.push({ term: { projectId: filters.projectId } });
    }

    if (
      filters.tags &&
      Array.isArray(filters.tags) &&
      filters.tags.length > 0
    ) {
      esFilters.push({ terms: { tags: filters.tags } });
    }

    if (filters.dueDate) {
      const dateFilter: Record<string, any> = {};
      if (filters.dueDate.$lte) {
        dateFilter.lte = filters.dueDate.$lte;
      }
      if (filters.dueDate.$gte) {
        dateFilter.gte = filters.dueDate.$gte;
      }
      esFilters.push({ range: { dueDate: dateFilter } });
    }

    return esFilters;
  }

  async reindexAllTasks(tasks: TaskForIndexing[]): Promise<void> {
    this.logger.log("Starting task reindexing...");

    for (const task of tasks) {
      await this.indexTask(task);
    }

    this.logger.log(`Reindexed ${tasks.length} tasks successfully`);
  }

  async reindexAllProjects(projects: ProjectForIndexing[]): Promise<void> {
    this.logger.log("Starting project reindexing...");

    for (const project of projects) {
      await this.indexProject(project);
    }

    this.logger.log(`Reindexed ${projects.length} projects successfully`);
  }
}
