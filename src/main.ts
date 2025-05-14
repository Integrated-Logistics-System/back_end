import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import HttpExceptionFilter from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;

  // 글로벌 미들웨어 설정
  app.use(helmet());
  app.enableCors();

  // API 경로 접두사 설정
  app.setGlobalPrefix('api');

  // API 버전 관리 설정
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 유효성 검사 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 유효성 검증을 위한 데코레이터가 없는 속성은 제거
      transform: true, // 타입 변환 활성화
      forbidNonWhitelisted: true, // 화이트리스트에 없는 속성이 있으면 요청 거부
      transformOptions: {
        enableImplicitConversion: true, // 암시적 타입 변환 활성화
      },
    }),
  );

  // 전역 예외 필터 설정
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger 설정
  const swaggerConfig = new DocumentBuilder()
    .setTitle('상가 추천 시스템 API')
    .setDescription('상가 추천 시스템을 위한 API 문서')
    .setVersion('1.0')
    .addTag('recommend', '상가 추천 API')
    .addTag('markets', '상가 정보 API')
    .addTag('buildings', '건물 정보 API')
    .addTag('search', '검색 API')
    .addTag('health', '헬스 체크 API')
    .addTag('admin', '관리자 API')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Ollama 서비스는 모듈 초기화 시 qwen3:1.7b 모델을 자동으로 로드함
  // LangChain을 통해 Ollama 연동
  // 구현은 OllamaService의 onModuleInit() 메서드에서 처리

  await app.listen(port);
  logger.log(`애플리케이션이 포트 ${port}에서 실행 중입니다`);
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  let errorMessage = 'Unknown error occurred';
  if (err instanceof Error) {
    errorMessage = err.message;
    if (err.stack) {
      logger.error(`Stack trace: ${err.stack}`);
    }
  }
  logger.error(`애플리케이션 실행 중 오류가 발생했습니다: ${errorMessage}`);
  process.exit(1);
});
