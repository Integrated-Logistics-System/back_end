import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoordinatesDto } from './dto/naver-geocoding.dto';
import axios from 'axios';

@Injectable()
export class NaverService {
  private readonly logger = new Logger(NaverService.name);
  private readonly apiUrl =
    'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode';
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('NAVER_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('NAVER_CLIENT_SECRET') || '';
  }

  /**
   * 주소를 좌표로 변환합니다.
   * @param address 변환할 주소
   * @returns 좌표 정보 (위도, 경도, 주소)
   */
  async geocodeAddress(address: string): Promise<CoordinatesDto | null> {
    if (!this.clientId || !this.clientSecret) {
      this.logger.error('Naver API credentials are not configured');
      return null;
    }

    try {
      const response = await axios.get(
        'https://maps.apigw.ntruss.com/map-geocode/v2/geocode',
        {
          params: { query: address },
          headers: {
            'X-NCP-APIGW-API-KEY-ID': this.clientId,
            'X-NCP-APIGW-API-KEY': this.clientSecret,
            Accept: 'application/json',
          },
        },
      );
      const { data } = response;

      if (
        data.status !== 'OK' ||
        !data.addresses ||
        data.addresses.length === 0
      ) {
        this.logger.warn(`No results found for address: ${address}`);
        return null;
      }

      const firstResult = data.addresses[0];

      return {
        latitude: parseFloat(firstResult.y),
        longitude: parseFloat(firstResult.x),
        address: firstResult.roadAddress || firstResult.jibunAddress,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Geocoding error for address ${address}: ${errorMessage}`,
        error instanceof Error ? error.stack : '',
      );
      return null;
    }
  }
}
