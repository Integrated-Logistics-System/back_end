import { Controller, Get, Query, UseGuards, Request } from "@nestjs/common";
import { SearchService } from "./search.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "../common/types";

@Controller("search")
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async searchAll(
    @Query("q") query: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!query) {
      return { tasks: [], projects: [] };
    }

    return this.searchService.searchAll(query, req.user.userId);
  }

  @Get("tasks")
  async searchTasks(
    @Query("q") query: string,
    @Query("status") status: string | undefined,
    @Query("priority") priority: string | undefined,
    @Query("projectId") projectId: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!query) {
      return [];
    }

    const filters: Record<string, string> = {};
    if (status) filters["status"] = status;
    if (priority) filters["priority"] = priority;
    if (projectId) filters["projectId"] = projectId;

    return this.searchService.searchTasks(query, req.user.userId, filters);
  }

  @Get("projects")
  async searchProjects(
    @Query("q") query: string,
    @Query("status") status: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!query) {
      return [];
    }

    const filters: Record<string, string> = {};
    if (status) filters["status"] = status;

    return this.searchService.searchProjects(query, req.user.userId, filters);
  }

  @Get("suggestions")
  async getSuggestions(
    @Query("q") query: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!query || query.length < 2) {
      return [];
    }

    return this.searchService.getSuggestions(query, req.user.userId);
  }
}
