# TaskMind Backend

## 🚀 최신 업데이트 (2025년 5월 30일)

이 프로젝트는 최신 NestJS v11.1.0과 관련 의존성들로 업데이트되었습니다.

### 주요 업데이트 내용
- **NestJS**: v11.1.0 (최신 안정 버전)
- **TypeScript**: v5.7.3
- **LangChain**: v0.4.1 (최신 버전)
- **Elasticsearch**: v8.16.0
- **기타 모든 의존성**: 최신 버전

## 🛠️ 빠른 시작

### 1. 의존성 업데이트 및 설치
```bash
# 자동 업데이트 스크립트 실행
./update-dependencies.sh

# 또는 수동 설치
npm install
```

### 2. 환경 설정
```bash
# .env 파일 복사 및 설정
cp .env.example .env
# .env 파일에서 필요한 환경 변수 설정
```

### 3. 개발 서버 실행
```bash
# 개발 모드
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod

# 디버그 모드
npm run start:debug
```

## 📋 사용 가능한 스크립트

```bash
npm run build          # 프로젝트 빌드
npm run start         # 프로덕션 모드 실행
npm run start:dev     # 개발 모드 (watch 모드)
npm run start:debug   # 디버그 모드
npm run test          # 테스트 실행
npm run test:watch    # 테스트 watch 모드
npm run test:cov      # 테스트 커버리지
npm run test:e2e      # E2E 테스트
npm run lint          # ESLint 실행
npm run format        # Prettier 포맷팅
```

## 🏗️ 프로젝트 구조

```
src/
├── app.module.ts          # 메인 애플리케이션 모듈
├── main.ts               # 애플리케이션 진입점
├── modules/              # 기능별 모듈들
├── common/               # 공통 유틸리티 및 데코레이터
├── config/               # 설정 파일들
└── guards/               # 가드 및 인터셉터
```

## 🔧 기술 스택

### 백엔드 프레임워크
- **NestJS** v11.1.0 - Node.js 백엔드 프레임워크
- **TypeScript** v5.7.3 - 타입 안전성

### 데이터베이스 & 검색
- **MongoDB** with **Mongoose** v8.15.1
- **Elasticsearch** v8.16.0

### AI & 언어 모델
- **LangChain** v0.4.1 - AI 애플리케이션 프레임워크
- **LangGraph** v0.2.79 - 워크플로우 관리
- **Ollama** v0.5.16 - 로컬 LLM 실행
- **OpenAI** 통합

### 인증 & 보안
- **JWT** 토큰 기반 인증
- **Passport** 인증 전략
- **bcrypt** 비밀번호 해싱

### 작업 큐 & 캐싱
- **Bull** v4.17.0 - 작업 큐 관리
- **Redis** with **ioredis** v5.6.1

## 🌟 주요 기능

- RESTful API 서버
- JWT 기반 인증 시스템
- AI/LLM 통합 (LangChain + Ollama)
- Elasticsearch 검색 기능
- 작업 큐 관리 (Bull + Redis)
- MongoDB 데이터베이스 연동
- 실시간 통신 지원

## 🔐 환경 변수

`.env` 파일에 다음 변수들을 설정하세요:

```env
# 데이터베이스
MONGODB_URI=mongodb://localhost:27017/taskmind
REDIS_URL=redis://localhost:6379

# 인증
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200

# AI/LLM
OPENAI_API_KEY=your-openai-api-key
OLLAMA_BASE_URL=http://localhost:11434
```

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# 테스트 커버리지
npm run test:cov

# E2E 테스트
npm run test:e2e

# 테스트 watch 모드
npm run test:watch
```

## 📚 API 문서

개발 서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:
- Swagger UI: `http://localhost:3000/api`

## 🔄 마이그레이션 노트

NestJS v11로 업그레이드하면서 다음 사항들이 변경되었습니다:

1. **Express v5 지원**: 와일드카드 라우트 패턴 업데이트
2. **Cache 모듈**: Redis store가 Keyv 기반으로 변경
3. **Terminus**: Health check 구현 방식 개선
4. **TypeScript**: 최신 버전 지원

자세한 내용은 [NestJS 마이그레이션 가이드](https://docs.nestjs.com/migration-guide)를 참고하세요.

## 📞 문제 해결

### 자주 발생하는 문제

1. **의존성 설치 오류**
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

2. **포트 충돌**
   - 기본 포트 3000 사용 중인 경우 환경 변수로 변경
   ```bash
   PORT=3001 npm run start:dev
   ```

3. **MongoDB 연결 오류**
   - MongoDB 서비스 실행 상태 확인
   - 연결 문자열 확인

---

✅ **개발 환경 체크리스트**
- [ ] Node.js v18+ 설치 확인
- [ ] MongoDB 실행 중
- [ ] Redis 실행 중
- [ ] Elasticsearch 실행 중 (선택사항)
- [ ] 환경 변수 설정 완료
- [ ] 의존성 설치 완료
- [ ] 빌드 성공 확인
