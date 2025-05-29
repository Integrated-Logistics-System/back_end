import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RecommendRequestDto {
  @ApiProperty({ description: '검색할 텍스트', example: '마포구 카페' })
  @IsString()
  text: string = '';
}
