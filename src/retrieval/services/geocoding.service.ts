import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  confidence?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  // 주요 지역의 기본 좌표값 (API 실패 시 폴백용)
  private readonly locationDefaults: Record<string, GeocodingResult> = {
    강남역: { latitude: 37.497952, longitude: 127.027619 },
    강남구: { latitude: 37.497952, longitude: 127.027619 },
    홍대입구역: { latitude: 37.557192, longitude: 126.925381 },
    홍대: { latitude: 37.557192, longitude: 126.925381 },
    신촌역: { latitude: 37.555946, longitude: 126.936893 },
    신촌: { latitude: 37.555946, longitude: 126.936893 },
    이태원: { latitude: 37.534567, longitude: 126.994734 },
    명동: { latitude: 37.563692, longitude: 126.982592 },
    종로: { latitude: 37.570028, longitude: 126.976733 },
    마포구: { latitude: 37.560284, longitude: 126.908755 },
    서울시청: { latitude: 37.5665, longitude: 126.978 },
    서울역: { latitude: 37.554648, longitude: 126.97088 },
    잠실: { latitude: 37.513294, longitude: 127.100052 },
    건대입구: { latitude: 37.540705, longitude: 127.069668 },
    성수동: { latitude: 37.544581, longitude: 127.055855 },
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('NAVER_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('NAVER_CLIENT_SECRET') || '';

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        '네이버 API 키가 설정되지 않았습니다. 기본 좌표값을 사용합니다.',
      );
    }
  }

  /**
   * 주소를 좌표로 변환
   */
  async getCoordinates(address: string): Promise<GeocodingResult> {
    // 1차: 기본 좌표값에서 찾기
    const defaultResult = this.findInDefaults(address);
    if (defaultResult) {
      this.logger.debug(
        `기본 좌표 사용: ${address} -> ${defaultResult.latitude}, ${defaultResult.longitude}`,
      );
      return defaultResult;
    }

    // 2차: 네이버 API 호출
    if (this.clientId && this.clientSecret) {
      const apiResult = await this.callNaverGeocodingAPI(address);
      if (apiResult) {
        return apiResult;
      }
    }

    // 3차: 폴백 (서울시청)
    this.logger.warn(`좌표 변환 실패, 기본값 사용: ${address}`);
    return this.locationDefaults['서울시청'];
  }

  /**
   * 좌표를 주소로 변환 (역지오코딩)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      return `위도: ${latitude}, 경도: ${longitude}`;
    }

    try {
      this.logger.debug(`역지오코딩 요청: ${latitude}, ${longitude}`);

      const response = await firstValueFrom(
        this.httpService.get(
          'https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc',
          {
            params: {
              coords: `${longitude},${latitude}`,
              sourcecrs: 'epsg:4326',
              targetcrs: 'epsg:4326',
              orders: 'roadaddr,legalcode',
            },
            headers: {
              'X-NCP-APIGW-API-KEY-ID': this.clientId,
              'X-NCP-APIGW-API-KEY': this.clientSecret,
            },
          },
        ),
      );

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        const region = result.region;

        // 상세 주소 구성
        const address = [
          region.area1?.name, // 시/도
          region.area2?.name, // 구/군
          region.area3?.name, // 동/읍/면
        ]
          .filter(Boolean)
          .join(' ');

        this.logger.debug(`역지오코딩 결과: ${address}`);
        return address || `위도: ${latitude}, 경도: ${longitude}`;
      }

      return `위도: ${latitude}, 경도: ${longitude}`;
    } catch (error) {
      this.logger.error('역지오코딩 실패:', error);
      return `위도: ${latitude}, 경도: ${longitude}`;
    }
  }

  /**
   * 여러 주소를 일괄 변환
   */
  async batchGeocode(addresses: string[]): Promise<GeocodingResult[]> {
    const results: GeocodingResult[] = [];

    for (const address of addresses) {
      try {
        const result = await this.getCoordinates(address);
        results.push(result);

        // API 호출 간격 (Rate Limiting 방지)
        await this.sleep(100);
      } catch (error) {
        this.logger.error(`배치 지오코딩 실패: ${address}`, error);
        results.push(this.locationDefaults['서울시청']);
      }
    }

    return results;
  }

  /**
   * 두 지점 간의 거리 계산 (Haversine 공식)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위
  }

  /**
   * 기본 위치 목록에서 검색
   */
  private findInDefaults(address: string): GeocodingResult | null {
    // 정확한 일치 검색
    if (this.locationDefaults[address]) {
      return this.locationDefaults[address];
    }

    // 부분 일치 검색
    for (const [key, value] of Object.entries(this.locationDefaults)) {
      if (address.includes(key) || key.includes(address)) {
        return value;
      }
    }

    return null;
  }

  /**
   * 네이버 지오코딩 API 호출
   */
  private async callNaverGeocodingAPI(
    address: string,
  ): Promise<GeocodingResult | null> {
    try {
      this.logger.debug(`네이버 지오코딩 API 호출: ${address}`);

      const response = await firstValueFrom(
        this.httpService.get(
          'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode',
          {
            params: { query: address },
            headers: {
              'X-NCP-APIGW-API-KEY-ID': this.clientId,
              'X-NCP-APIGW-API-KEY': this.clientSecret,
            },
          },
        ),
      );

      const addresses = response.data.addresses;
      if (addresses && addresses.length > 0) {
        const result = addresses[0];
        const geocodingResult: GeocodingResult = {
          latitude: parseFloat(result.y),
          longitude: parseFloat(result.x),
          formattedAddress: result.roadAddress || result.jibunAddress,
          confidence: result.distance ? 'high' : 'medium',
        };

        this.logger.debug(
          `지오코딩 성공: ${address} -> ${geocodingResult.latitude}, ${geocodingResult.longitude}`,
        );
        return geocodingResult;
      }

      return null;
    } catch (error) {
      this.logger.error('네이버 지오코딩 API 실패:', error);
      return null;
    }
  }

  /**
   * 유틸리티: 각도를 라디안으로 변환
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 유틸리티: 지연 함수
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.clientId || !this.clientSecret) {
        return true; // API 키가 없어도 기본 좌표는 사용 가능
      }

      // 간단한 테스트 요청
      await this.getCoordinates('서울시청');
      return true;
    } catch (error) {
      this.logger.error('지오코딩 헬스체크 실패:', error);
      return false;
    }
  }
}
