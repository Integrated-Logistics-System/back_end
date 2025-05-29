// RAG 시스템 타입 정의

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export interface ShopData {
  shop_id: string;
  name: string;
  category_large: string;
  category_middle: string;
  category_small: string;
  dong_name: string;
  full_address: string;
  latitude: number;
  longitude: number;
}

export interface BuildingData {
  dong_name: string;
  jibun: string;
  building_name?: string;
  purpose_category_name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RecommendationQuery {
  text: string;
  location: LocationData;
  category: string;
  radius?: {
    min: number;
    max: number;
  };
}

export interface RecommendationContext {
  shops: ShopData[];
  buildings: BuildingData[];
  query: RecommendationQuery;
}

export interface RecommendationResult {
  building: string;
  address: string;
  score: number;
  reasons: string[];
  analysis: string;
}

// LangChain Document 확장
export interface LocationDocument {
  pageContent: string;
  metadata: {
    type: 'shop' | 'building';
    location: LocationData;
    category?: string;
    distance?: number;
    [key: string]: any;
  };
}
