# 🚀 RAG 기반 창업 자리 추천 시스템

LangChain과 Ollama를 활용한 창업 입지 추천 백엔드 시스템입니다.

## 🏗️ **시스템 아키텍처**

```
사용자 질의 → RAG 시스템 → LLM 분석 → 추천 결과
     ↓
  쿼리 파싱
     ↓
  하이브리드 검색 (Elasticsearch + MongoDB)
     ↓
  LangChain 체인 (Ollama LLM)
     ↓
  캐싱 (Redis) + 최종 응답
```

## 🔧 **기술 스택**

- **Backend**: NestJS, TypeScript
- **AI/LLM**: LangChain, Ollama
- **Database**: MongoDB, Elasticsearch  
- **Cache**: Redis
- **External API**: Naver Geocoding

## 🚦 **사전 요구사항**

1. **Node.js** (v18 이상)
2. **MongoDB** (실행 중)
3. **Elasticsearch** (실행 중)
4. **Redis** (실행 중)
5. **Ollama** (실행 중, 모델 설치됨)

### Ollama 모델 설치
```bash
# Ollama 설치 후
ollama pull gemma3:1b-it-qat
ollama pull mxbai-embed-large
```

## 🎯 **시작하기**

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`config/.env` 파일에서 다음 변수들을 확인/설정:

```env
# MongoDB
MONGO_URI=mongodb://choi:chltjdgus123!@192.168.0.111:27017/real_estate_db?authSource=admin

# Elasticsearch
ELASTICSEARCH_NODE=http://192.168.0.111:9200

# Redis
REDIS_HOST=192.168.0.111
REDIS_PORT=6379

# Ollama & LangChain
OLLAMA_BASE_URL=http://192.168.0.111:11434
OLLAMA_MODEL=gemma3:1b-it-qat
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large

# Naver API
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# RAG 설정
MAX_SEARCH_RESULTS=50
CACHE_TTL=300
LOG_LEVEL=debug
```

### 3. 불필요한 파일 정리 (선택 사항)
```bash
# 자동 정리 스크립트 실행
npm run cleanup

# 또는 수동으로 정리
rm -rf src/ollama src/redis
rm -f src/recommend/*.new.ts src/recommend/*.old.ts
```

### 4. 애플리케이션 실행
```bash
# 개발 모드
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

## 🧪 **테스트**

### 1. 시스템 상태 확인
```bash
npm run rag:health
# 또는
curl http://localhost:3000/api/recommend/health
```

### 1-1. 모든 서비스 상태 일괄 확인
```bash
# MongoDB 상태
curl -f mongodb://192.168.0.111:27017/admin || echo "❌ MongoDB 연결 실패"

# Elasticsearch 상태  
curl -f http://192.168.0.111:9200/_cluster/health || echo "❌ Elasticsearch 연결 실패"

# Redis 상태
redis-cli -h 192.168.0.111 ping || echo "❌ Redis 연결 실패"

# Ollama 상태
curl -f http://192.168.0.111:11434/api/tags || echo "❌ Ollama 연결 실패"
```

### 2. 간단한 테스트
```bash
npm run rag:test
# 또는
curl http://localhost:3000/api/recommend/test
```

### 3. 전체 RAG 시스템 테스트
```bash
npm run test:rag
```

### 4. 직접 API 호출 테스트
```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"text": "강남역 근처 카페 창업하고 싶어요"}'
```

## 📚 **API 문서**

서버 실행 후 다음 URL에서 Swagger 문서 확인:
- **API 문서**: http://localhost:3000/api/docs
- **헬스체크**: http://localhost:3000/api/recommend/health
- **테스트**: http://localhost:3000/api/recommend/test

## 🔍 **API 엔드포인트**

### POST /api/recommend
창업 자리 추천 요청

**Request:**
```json
{
  "text": "강남역 근처 카페 창업하고 싶어요"
}
```

**Response:**
```json
{
  "input_latitude": 37.497952,
  "input_longitude": 127.027619,
  "radius_min_meters": 500,
  "radius_max_meters": 1000,
  "category": "카페",
  "recommendation": {
    "building": "강남 CGV 상가",
    "address": "서울특별시 강남구 테헤란로 123",
    "score": 8.5,
    "reasons": [
      "지하철역 도보 2분 거리",
      "주변 카페 밀도 적정",
      "오피스 밀집 지역으로 평일 수요 높음"
    ]
  },
  "llm_comment": "강남역 인근은 직장인과 유동인구가 많아 카페 창업에 유리한 입지입니다."
}
```

### GET /api/recommend/health
시스템 상태 확인

### GET /api/recommend/test
간단한 테스트 요청

## 🏗️ **프로젝트 구조**

```
src/
├── rag/                    # RAG 핵심 모듈
│   ├── chains/            # LangChain 체인들
│   ├── retrievers/        # 검색기들
│   ├── prompts/           # 프롬프트 템플릿
│   └── types/             # RAG 타입 정의
├── llm/                   # LLM 서비스 (Ollama)
├── retrieval/             # 데이터 검색 계층
│   └── services/          # MongoDB, Elasticsearch, Geocoding
├── cache/                 # Redis 캐싱
├── recommend/             # 추천 API 엔드포인트
└── config/                # 설정 관리
```

## 🔧 **개발 가이드**

### 1. 새로운 프롬프트 추가
`src/rag/prompts/index.ts`에서 PromptTemplate 추가

### 2. 검색 로직 수정
`src/rag/retrievers/hybrid.retriever.ts`에서 검색 전략 수정

### 3. LLM 모델 변경
`config/.env`에서 `OLLAMA_MODEL` 변경

### 4. 캐싱 전략 수정
`src/cache/cache.service.ts`에서 TTL 및 키 전략 수정

### 💡 **개발 팁**

#### Hot Reload 최적화
```bash
# TypeScript 컴파일 속도 향상
npm run start:dev -- --preserveWatchOutput

# 특정 모듈만 재시작
npm run start:dev -- --watch --watchAssets
```

#### 디버깅 모드
```bash
# 상세 로그 활성화
DEBUG=rag:* npm run start:dev

# LangChain 디버그 모드
LANGCHAIN_VERBOSE=true npm run start:dev
```

#### 성능 프로파일링
```bash
# 메모리 사용량 모니터링
node --inspect=0.0.0.0:9229 dist/main.js

# CPU 프로파일링
node --prof dist/main.js
```

## 🚨 **문제 해결**

### 1. Ollama 연결 실패
```bash
# Ollama 서비스 상태 확인
curl http://192.168.0.111:11434/api/tags

# 모델 재설치
ollama pull gemma3:1b-it-qat
```

### 2. MongoDB/Elasticsearch 연결 실패
- 서비스 실행 상태 확인
- 네트워크 연결 확인
- 인증 정보 확인

### 3. Redis 연결 실패
```bash
# Redis 서비스 확인
redis-cli -h 192.168.0.111 ping
```

## 📊 **성능 최적화**

1. **캐싱**: 동일한 쿼리는 5분간 캐싱
2. **검색 제한**: 최대 50개 결과로 제한
3. **배치 처리**: 3개씩 청크 단위로 처리
4. **프롬프트 최적화**: 간결하고 명확한 프롬프트 사용

## 🤝 **기여 가이드**

1. 이슈 등록
2. 기능 브랜치 생성
3. 코드 작성 및 테스트
4. Pull Request 생성

## 📝 **라이센스**

UNLICENSED

---

**개발자**: 최성현  
**이메일**: your.email@example.com  
**버전**: 1.0.0
