import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProjectDocument = Project & Document;

export enum ProjectStatus {
  PLANNING = "planning",
  ACTIVE = "active",
  ON_HOLD = "on_hold",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ enum: ProjectStatus, default: ProjectStatus.PLANNING })
  status: ProjectStatus;

  @Prop({ required: false })
  startDate?: Date;

  @Prop({ required: false })
  endDate?: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ required: false })
  color?: string; // For UI organization

  @Prop({ type: Object, default: {} })
  progress: {
    totalTasks: number;
    completedTasks: number;
    percentage: number;
  };

  @Prop({ type: Object, default: {} })
  aiInsights: {
    estimatedCompletion?: Date;
    riskFactors?: string[];
    suggestions?: string[];
    blockedTasks?: number;
    overduePercentage?: number;
    lastAnalyzedAt?: Date;
  };

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: "User" }], default: [] })
  collaborators: Types.ObjectId[];

  // Timestamps (provided by mongoose with timestamps: true)
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Create text index for search functionality
ProjectSchema.index({
  name: "text",
  description: "text",
  tags: "text",
});
