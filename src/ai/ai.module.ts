import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { SimpleTaskWorkflow } from './workflows/simple-task.workflow';
import { TaskCreationWorkflow } from './workflows/task-creation.workflow';
import { AdvancedTaskCreationWorkflow } from './workflows/advanced-task-creation.workflow';
import { ConversationalAIWorkflow } from './workflows/conversational-ai.workflow';
import { ProjectAnalysisWorkflow } from './workflows/project-analysis.workflow';

@Module({
  controllers: [AiController],
  providers: [
    AiService, 
    SimpleTaskWorkflow, 
    TaskCreationWorkflow,
    AdvancedTaskCreationWorkflow,
    ConversationalAIWorkflow,
    ProjectAnalysisWorkflow,
  ],
  exports: [
    AiService, 
    SimpleTaskWorkflow, 
    TaskCreationWorkflow,
    AdvancedTaskCreationWorkflow,
    ConversationalAIWorkflow,
    ProjectAnalysisWorkflow,
  ],
})
export class AiModule {}
