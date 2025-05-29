// 건물 데이터의 기본 구조
export interface BuildingDocument {
  dong_name: string; // 동 이름 (예: "서울특별시 동작구 상도1동")
  jibun: string; // 지번 (예: "544")
  purpose_category_name: string; // 용도 분류 (예: "상업용")
  latitude: number; // 위도
  longitude: number; // 경도
  mongo_id: string; // MongoDB ObjectId
}

// Elasticsearch 응답 구조
export interface ElasticsearchHit {
  _index: string; // 인덱스 이름
  _id: string; // 문서 ID
  _score: number; // 검색 점수
  _source: BuildingDocument; // 실제 문서 데이터
}

// Elasticsearch 검색 응답 전체 구조
export interface ElasticsearchResponse {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number;
    hits: ElasticsearchHit[];
  };
}
