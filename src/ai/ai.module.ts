import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { SimpleTaskWorkflow } from './workflows/simple-task.workflow';

@Module({
  controllers: [AiController],
  providers: [AiService, SimpleTaskWorkflow],
  exports: [AiService, SimpleTaskWorkflow],
})
export class AiModule {}
