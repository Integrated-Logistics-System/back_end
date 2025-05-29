import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { AiService } from "./ai.service";
import { SimpleTaskWorkflow } from "./workflows/simple-task.workflow";
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

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly taskWorkflow: SimpleTaskWorkflow
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
        model: "qwen2.5:0.5b",
        workflow: "LangGraph",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        input: testDto.input,
        error: error.message,
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
