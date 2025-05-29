import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TaskDocument = Task & Document;

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Project", required: false })
  projectId?: Types.ObjectId;

  @Prop({ enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Prop({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Prop({ required: false })
  dueDate?: Date;

  @Prop({ required: false })
  completedAt?: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: {} })
  aiMetadata: {
    extractedEntities?: {
      people?: string[];
      places?: string[];
      organizations?: string[];
      dates?: string[];
    };
    suggestedPriority?: TaskPriority;
    estimatedDuration?: number; // minutes
    relatedTasks?: Types.ObjectId[];
    confidence?: number; // 0-1
  };

  @Prop({ type: [Object], default: [] })
  subtasks: {
    title: string;
    completed: boolean;
    completedAt?: Date;
  }[];

  @Prop({ required: false })
  reminderAt?: Date;

  @Prop({ default: false })
  isArchived: boolean;

  // Original natural language input from user
  @Prop({ required: false })
  originalInput?: string;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Create text index for search functionality
TaskSchema.index({
  title: "text",
  description: "text",
  tags: "text",
  originalInput: "text",
});
