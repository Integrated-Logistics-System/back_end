// RAG 시스템 관련 타입 정의

export interface LocationQuery {
  searchText: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  category?: string;
}

export interface RetrievedDocument {
  id: string;
  content: string;
  metadata: {
    source: 'shop' | 'building';
    category?: string;
    address?: string;
    coordinates: [number, number];
    relevanceScore: number;
    distance?: number;
  };
}

export interface RAGResponse {
  input_latitude: number;
  input_longitude: number;
  radius_min_meters: number;
  radius_max_meters: number;
  category: string;
  recommendation: {
    building: string;
    address: string;
    score: number;
    reasons: string[];
  };
  llm_comment: string;
}

export interface ParsedQuery {
  location: string;
  category: string;
  radius: number;
  requirements: string[];
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

// 검색 옵션
export interface SearchOptions {
  maxResults?: number;
  includeDistance?: boolean;
  sortBy?: 'relevance' | 'distance' | 'score';
}

// LLM 응답 파싱용
export interface LLMRecommendationResponse {
  recommendation: {
    building: string;
    address: string;
    score: number;
    reasons: string[];
  };
  llm_comment: string;
}
