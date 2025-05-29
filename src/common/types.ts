import { Request } from "express";

// Request 타입 정의
export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    name: string;
  };
}

// JWT Payload 타입 정의
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// Elasticsearch 응답 타입
export interface ElasticsearchHit {
  _id: string;
  _source: any;
  _score: number;
}

export interface ElasticsearchResponse {
  hits: {
    hits: ElasticsearchHit[];
  };
  suggest?: {
    [key: string]: Array<{
      options: Array<{ text: string }>;
    }>;
  };
}
