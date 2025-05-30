import { Controller, Post, Body, UseGuards, Get, Query } from "@nestjs/common";
import { AiService } from "./ai.service";
import { SimpleTaskWorkflow } from "./workflows/simple-task.workflow";
import { TaskCreationWorkflow } from "./workflows/task-creation.workflow";
import { AdvancedTaskCreationWorkflow } from "./workflows/advanced-task-creation.workflow";
import { ConversationalAIWorkflow } from "./workflows/conversational-ai.workflow";
import { ProjectAnalysisWorkflow } from "./workflows/project-analysis.workflow";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IsString, IsOptional } from "class-validator";

class AskQuestionDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  context?: string;
}

class TestWorkflowDto {
  @IsString()
  input: string;
}

class CreateTaskWorkflowDto {
  @IsString()
  input: string;

  @IsString()
  userId: string;
}

class ConversationDto {
  @IsString()
  message: string;

  @IsOptional()
  conversationHistory?: any[];

  @IsOptional()
  context?: any;
}

class ProjectAnalysisDto {
  @IsString()
  projectId: string;

  @IsString()
  userId: string;
}

class AnalyzeTaskPatternsDto {
  tasks: any[];
}

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly taskWorkflow: SimpleTaskWorkflow,
    private readonly taskCreationWorkflow: TaskCreationWorkflow,
    private readonly advancedTaskCreationWorkflow: AdvancedTaskCreationWorkflow,
    private readonly conversationalAIWorkflow: ConversationalAIWorkflow,
    private readonly projectAnalysisWorkflow: ProjectAnalysisWorkflow,
  ) {}

  @Post("ask")
  async askQuestion(@Body() askQuestionDto: AskQuestionDto) {
    const { question, context } = askQuestionDto;
    const answer = await this.aiService.answerQuestion(question, context);

    return {
      question,
      answer,
      timestamp: new Date().toISOString(),
    };
  }

  @Post("test-workflow")
  async testWorkflow(@Body() testDto: TestWorkflowDto) {
    const startTime = Date.now();
    
    try {
      const result = await this.taskWorkflow.execute(testDto.input);
      const duration = Date.now() - startTime;
      
      return {
        input: testDto.input,
        result,
        processingTime: `${duration}ms`,
        workflow: "LangGraph Simple Task",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        input: testDto.input,
        error: error instanceof Error ? error.message : String(error),
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post("create-task-workflow")
  async createTaskWorkflow(@Body() createDto: CreateTaskWorkflowDto) {
    const startTime = Date.now();
    
    try {
      const result = await this.taskCreationWorkflow.execute(
        createDto.input, 
        createDto.userId
      );
      const duration = Date.now() - startTime;
      
      return {
        input: createDto.input,
        result,
        processingTime: `${duration}ms`,
        workflow: "LangGraph Task Creation",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        input: createDto.input,
        error: error instanceof Error ? error.message : String(error),
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // 🔥 새로운 고급 워크플로우 엔드포인트들!

  @Post("advanced-task-creation")
  async advancedTaskCreation(@Body() createDto: CreateTaskWorkflowDto) {
    const startTime = Date.now();
    
    try {
      const result = await this.advancedTaskCreationWorkflow.execute(
        createDto.input, 
        createDto.userId
      );
      const duration = Date.now() - startTime;
      
      return {
        input: createDto.input,
        result,
        processingTime: `${duration}ms`,
        workflow: "🔥 LangGraph Advanced Task Creation",
        features: ["조건부 분기", "에러 처리", "상태 관리"],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        input: createDto.input,
        error: error instanceof Error ? error.message : String(error),
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post("conversation")
  async conversation(@Body() conversationDto: ConversationDto) {
    const startTime = Date.now();
    
    try {
      const result = await this.conversationalAIWorkflow.processMessage(
        conversationDto.message,
        conversationDto.conversationHistory || [],
        conversationDto.context || {}
      );
      const duration = Date.now() - startTime;
      
      return {
        ...result,
        processingTime: `${duration}ms`,
        workflow: "🔥 LangGraph Conversational AI",
        features: ["의도 파악", "엔티티 추출", "동적 분기"],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        message: conversationDto.message,
        error: error instanceof Error ? error.message : String(error),
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post("analyze-project")
  async analyzeProject(@Body() analysisDto: ProjectAnalysisDto) {
    const startTime = Date.now();
    
    try {
      const result = await this.projectAnalysisWorkflow.analyzeProject(
        analysisDto.projectId,
        analysisDto.userId
      );
      const duration = Date.now() - startTime;
      
      return {
        ...result,
        processingTime: `${duration}ms`,
        workflow: "🔥 LangGraph Project Analysis",
        features: ["자동 재시도", "에러 복구", "복합 분석"],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        projectId: analysisDto.projectId,
        error: error instanceof Error ? error.message : String(error),
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // 기존 엔드포인트들...

  @Post("parse-task")
  async parseTask(@Body() testDto: TestWorkflowDto) {
    const startTime = Date.now();
    
    try {
      const result = await this.aiService.parseNaturalLanguageTask(testDto.input);
      const duration = Date.now() - startTime;
      
      return {
        input: testDto.input,
        result,
        processingTime: `${duration}ms`,
        method: "AI Service with LangChain",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        input: testDto.input,
        error: error instanceof Error ? error.message : String(error),
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post("suggest-priority")
  async suggestPriority(@Body() body: {
    title: string;
    description?: string;
    dueDate?: string;
    tags?: string[];
  }) {
    const startTime = Date.now();
    
    try {
      const task = {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      };
      
      const result = await this.aiService.suggestTaskPriority(task);
      const duration = Date.now() - startTime;
      
      return {
        task: body,
        suggestion: result,
        processingTime: `${duration}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        task: body,
        error: error instanceof Error ? error.message : String(error),
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post("analyze-patterns")
  async analyzePatterns(@Body() body: AnalyzeTaskPatternsDto) {
    const startTime = Date.now();
    
    try {
      const result = await this.aiService.analyzeTaskPatterns(body.tasks);
      const duration = Date.now() - startTime;
      
      return {
        taskCount: body.tasks.length,
        analysis: result,
        processingTime: `${duration}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        taskCount: body.tasks.length,
        error: error instanceof Error ? error.message : String(error),
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post("project-insights")
  async projectInsights(@Body() body: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    upcomingDeadlines: string[];
    recentActivity: string[];
  }) {
    const startTime = Date.now();
    
    try {
      const projectData = {
        ...body,
        upcomingDeadlines: body.upcomingDeadlines.map(date => new Date(date)),
      };
      
      const result = await this.aiService.generateProjectInsights(projectData);
      const duration = Date.now() - startTime;
      
      return {
        projectData: body,
        insights: result,
        processingTime: `${duration}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        projectData: body,
        error: error instanceof Error ? error.message : String(error),
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get("health")
  async healthCheck() {
    return {
      status: "healthy",
      services: {
        aiService: "active",
        simpleTaskWorkflow: "active", 
        taskCreationWorkflow: "active",
        advancedTaskCreationWorkflow: "🔥 active",
        conversationalAIWorkflow: "🔥 active",
        projectAnalysisWorkflow: "🔥 active",
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get("capabilities")
  async getCapabilities() {
    return {
      workflows: [
        {
          name: "Simple Task Workflow",
          description: "기본 작업 정보 추출 및 분석",
          endpoint: "/ai/test-workflow",
          type: "basic"
        },
        {
          name: "Task Creation Workflow", 
          description: "상세한 작업 생성 및 검증",
          endpoint: "/ai/create-task-workflow",
          type: "basic"
        },
        {
          name: "🔥 Advanced Task Creation",
          description: "조건부 분기와 스마트 에러 처리",
          endpoint: "/ai/advanced-task-creation",
          type: "🔥 langgraph"
        },
        {
          name: "🔥 Conversational AI",
          description: "의도 파악과 동적 상호작용",
          endpoint: "/ai/conversation", 
          type: "🔥 langgraph"
        },
        {
          name: "🔥 Project Analysis",
          description: "자동 재시도와 복합 분석",
          endpoint: "/ai/analyze-project",
          type: "🔥 langgraph"
        },
      ],
      features: [
        "자연어 작업 파싱",
        "우선순위 제안",
        "프로젝트 인사이트 생성",
        "작업 패턴 분석",
        "질문 응답",
        "🔥 조건부 워크플로우 분기",
        "🔥 스마트 에러 처리 및 재시도",
        "🔥 상태 기반 대화 관리",
      ],
      models: {
        default: "qwen2.5:0.5b",
        supported: ["qwen2.5:0.5b", "llama3.1", "gemma2"],
      },
    };
  }
}
