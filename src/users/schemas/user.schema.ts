import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  avatar?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  preferences: {
    timezone?: string;
    theme?: "light" | "dark";
    notifications?: {
      email: boolean;
      push: boolean;
    };
    aiSettings?: {
      priority: "auto" | "manual";
      reminderStyle: "gentle" | "assertive";
    };
  };

  @Prop({ default: Date.now })
  lastLoginAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
