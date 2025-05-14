import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectModel } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
import { Model } from 'mongoose';
import {
  Building,
  BuildingDocument,
} from '../buildings/schemas/building.schema';
import { Market, MarketDocument } from '../markets/schemas/market.schema';
import { OllamaService } from '../ollama/ollama.service';
import { REDIS_CLIENT } from '../redis/redis.module';

// MongoDB 결과에 대한 타입 정의
interface MongoMarketDocument {
  _id: any;
  name?: string;
  category?: string;
  location?: {
    dong_code?: string;
    address?: string;
    coordinates?: [number, number];
  };
  price?: number;
  size?: number;
  description?: string;
  status?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Elasticsearch 결과에 대한 타입 정의
export type ElasticsearchHit = {
  _source: {
    name?: string;
    category?: string;
    location?: {
      dong_code?: string;
      address?: string;
      coordinates?: number[];
    };
    price?: number;
    size?: number;
    description?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  };
  _score: number;
  _id: string;
};

// 타입 가드 함수
function isValidCoordinates(coords: unknown): coords is [number, number] {
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number'
  );
}

// 공통 마켓 데이터 타입
export interface MarketData {
  _id: unknown;
  name?: string;
  category?: string;
  location?: {
    dong_code?: string;
    address?: string;
    coordinates?: [number, number];
  };
  price?: number;
  size?: number;
  description?: string;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
  score?: number;
  [key: string]: unknown; // For any additional properties
}

// 추천 응답 타입
export interface RecommendationResponse {
  building: BuildingDocument | null;
  markets: MarketData[];
  analysis: string;
  fromCache: boolean;
}

@Injectable()
export class RecommendService {
  private readonly logger = new Logger(RecommendService.name);
  private readonly INDEX_NAME = 'markets';
  private readonly CACHE_PREFIX = 'recommend';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectModel(Market.name)
    private readonly marketModel: Model<MarketDocument>,
    @InjectModel(Building.name)
    private readonly buildingModel: Model<BuildingDocument>,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly ollamaService: OllamaService,
  ) {}

  private getCacheKey(dongCode: string, category: string): string {
    return `${this.CACHE_PREFIX}:${dongCode}:${category}`;
  }

  private getFromCache(): Promise<string | null> {
    // Redis 연결을 건너뜁니다.
    this.logger.log('캐시 조회 건너뜀');
    return Promise.resolve(null);
  }

  private setToCache(): Promise<void> {
    // Redis 연결을 건너뜁니다.
    this.logger.log('캐시 저장 건너뜀');
    return Promise.resolve();
  }

  private async searchMarkets(
    dongCode: string,
    category: string,
  ): Promise<MarketData[]> {
    try {
      const response = await this.elasticsearchService.search({
        index: this.INDEX_NAME,
        query: {
          bool: {
            must: [
              { match: { 'location.dong_code': dongCode } },
              { match: { category } },
            ],
          },
        },
        size: 10,
      });

      // Elasticsearch 결과를 MarketData로 변환
      const transformHit = (hit: ElasticsearchHit): MarketData => {
        const source = hit._source || {};

        // 타입 체크를 통한 안전한 변환
        const marketData: MarketData = {
          _id: typeof hit._id === 'string' ? hit._id : String(hit._id),
          name: typeof source.name === 'string' ? source.name : undefined,
          category:
            typeof source.category === 'string' ? source.category : undefined,
          location: undefined,
          price: typeof source.price === 'number' ? source.price : undefined,
          size: typeof source.size === 'number' ? source.size : undefined,
          description:
            typeof source.description === 'string'
              ? source.description
              : undefined,
          status: typeof source.status === 'string' ? source.status : undefined,
          created_at: source.created_at
            ? new Date(String(source.created_at))
            : undefined,
          updated_at: source.updated_at
            ? new Date(String(source.updated_at))
            : undefined,
          score: hit._score,
        };

        // 위치 정보 처리
        if (source.location && typeof source.location === 'object') {
          marketData.location = {
            dong_code:
              typeof source.location.dong_code === 'string'
                ? source.location.dong_code
                : undefined,
            address:
              typeof source.location.address === 'string'
                ? source.location.address
                : undefined,
            coordinates: isValidCoordinates(source.location.coordinates)
              ? source.location.coordinates
              : undefined,
          };
        }

        return marketData;
      };

      // 타입 안전하게 변환
      const hits = response.hits?.hits || [];
      return hits.map((hit) => {
        // 필요한 필드가 있는지 확인
        if (
          hit &&
          typeof hit === 'object' &&
          '_id' in hit &&
          '_source' in hit &&
          '_score' in hit
        ) {
          return transformHit(hit as ElasticsearchHit);
        }
        // 유효하지 않은 항목은 기본값으로 처리
        this.logger.warn('Invalid Elasticsearch hit detected');
        return {
          _id: 'unknown',
          score: 0,
        } as MarketData;
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Elasticsearch search error: ${errorMessage}`);
      this.logger.log('Falling back to MongoDB for market data');

      // MongoDB 결과를 가져옵니다.
      const markets = await this.marketModel
        .find({
          'location.dong_code': dongCode,
          category,
        })
        .limit(10)
        .lean<MongoMarketDocument[]>();

      // MongoDB 결과를 MarketData로 변환
      const transformMarket = (market: MongoMarketDocument): MarketData => {
        const marketData: MarketData = {
          _id: market._id,
          name: market.name,
          category: market.category,
          location: undefined,
          price: market.price,
          size: market.size,
          description: market.description,
          status: market.status,
          score: 1, // Default score for MongoDB results
          created_at: undefined,
          updated_at: undefined,
        };

        // 위치 정보 처리
        if (market.location) {
          marketData.location = {
            dong_code: market.location.dong_code,
            address: market.location.address,
            coordinates: isValidCoordinates(market.location.coordinates)
              ? market.location.coordinates
              : undefined,
          };
        }

        // 날짜 처리
        if (market.created_at instanceof Date) {
          marketData.created_at = market.created_at;
        } else if (market.created_at) {
          marketData.created_at = new Date(market.created_at);
        }

        if (market.updated_at instanceof Date) {
          marketData.updated_at = market.updated_at;
        } else if (market.updated_at) {
          marketData.updated_at = new Date(market.updated_at);
        }

        return marketData;
      };

      return markets.map(transformMarket);
    }
  }

  private async analyzeWithAI(
    markets: MarketData[],
    dongCode: string,
    category: string,
  ): Promise<string> {
    try {
      const prompt = `
      You are a real estate market analyst. Analyze the following commercial properties in dong ${dongCode} 
      for the ${category} category and provide insights and recommendations:
      
      ${JSON.stringify(markets, null, 2)}
      
      Please provide:
      1. Market trends
      2. Price analysis
      3. Recommendations for potential investors
      `;

      const result = await this.ollamaService.generateText(prompt);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI analysis error: ${errorMessage}`);
      return `Unable to generate AI analysis. Please try again later. Error: ${errorMessage}`;
    }
  }

  async getRecommendations(
    dong_code: string,
    category: string,
  ): Promise<RecommendationResponse> {
    this.logger.log(
      `[getRecommendations] Starting - dong_code: ${dong_code}, category: ${category}`,
    );

    try {
      // 입력 유효성 검사
      this.logger.log(
        `[getRecommendations] Validating input - dong_code type: ${typeof dong_code}, category type: ${typeof category}`,
      );
      if (!dong_code || !category) {
        const errorMessage = 'Dong code and category are required';
        this.logger.error(
          `[getRecommendations] Validation failed - ${errorMessage}`,
        );
        throw new BadRequestException(errorMessage);
      }

      this.logger.log('[getRecommendations] Input validation passed');

      // 캐시에서 데이터 가져오기 시도 (현재는 비활성화됨)
      const cached = await this.getFromCache();
      if (cached) {
        this.logger.log(
          '[getRecommendations] Returning cached recommendations',
        );
        try {
          return JSON.parse(cached) as RecommendationResponse;
        } catch (parseError) {
          this.logger.error(
            `[getRecommendations] Failed to parse cached data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          );
          this.logger.log(
            '[getRecommendations] Failed to parse cached data, fetching fresh data',
          );
        }
      }

      // 동네 정보 조회
      this.logger.log(
        `[getRecommendations] Fetching building info for dong: ${dong_code}`,
      );
      const building = await this.buildingModel
        .findOne({ 'location.dong_code': dong_code })
        .lean();

      // 상가 검색
      this.logger.log(
        `[getRecommendations] Searching markets for dong: ${dong_code}, category: ${category}`,
      );
      const markets = await this.searchMarkets(dong_code, category);

      // AI 분석
      this.logger.log('[getRecommendations] Generating AI analysis');
      const analysis = await this.analyzeWithAI(markets, dong_code, category);

      const result: RecommendationResponse = {
        building,
        markets,
        analysis,
        fromCache: false,
      };

      // 결과 캐싱 (현재는 비활성화됨)
      this.logger.log('[getRecommendations] Skipping cache save (disabled)');

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(
        `[getRecommendations] Error: ${errorMessage}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }
}
