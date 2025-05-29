import { ApiProperty } from '@nestjs/swagger';

export class RecommendationItemDto {
  @ApiProperty({ example: '공덕역 상가 B동' })
  building!: string;

  @ApiProperty({ example: '서울 마포구 공덕동 123-4' })
  address!: string;

  @ApiProperty({ example: 9.2 })
  score!: number;

  @ApiProperty({
    example: ['지하철 도보 3분', '오피스 상권', '카페 밀집 지역'],
    type: [String],
  })
  reasons!: string[];
}

export class RecommendResponseDto {
  @ApiProperty({ example: 37.540291 })
  input_latitude!: number;

  @ApiProperty({ example: 126.986655 })
  input_longitude!: number;

  @ApiProperty({ example: 500 })
  radius_min_meters!: number;

  @ApiProperty({ example: 500 })
  radius_max_meters!: number;

  @ApiProperty({ example: '카페' })
  category!: string;

  @ApiProperty({ type: RecommendationItemDto })
  recommendation!: RecommendationItemDto;

  @ApiProperty({
    example: '공덕동은 직장인 유동인구가 많고 역세권 입지로 적합합니다.',
  })
  llm_comment!: string;
}
