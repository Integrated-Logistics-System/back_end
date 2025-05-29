export class NaverGeocodingResponseDto {
  status: string = '';
  meta = {
    totalCount: 0,
    page: 0,
    count: 0,
  };
  addresses: Array<{
    roadAddress: string;
    jibunAddress: string;
    englishAddress: string;
    addressElements: Array<{
      types: string[];
      longName: string;
      shortName: string;
      code: string;
    }>;
    x: string; // 경도 (longitude)
    y: string; // 위도 (latitude)
    distance: number;
  }> = [];
  errorMessage: string = '';
}

export class CoordinatesDto {
  latitude: number = 0;
  longitude: number = 0;
  address: string = '';
}
