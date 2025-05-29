# 📝 TaskMind AI - 지능형 할 일 관리 백엔드 (LangGraph Edition)

TaskMind AI는 자연어 입력을 통해 할 일을 등록하고, **LangGraph 워크플로우**로 AI가 작업의 우선순위를 제안하거나 관련 정보를 찾아주며, 프로젝트 진행 상황에 대한 간단한 인사이트를 제공하는 스마트 할 일 관리 애플리케이션의 백엔드입니다.

## 🆕 **LangGraph 업데이트**

### **주요 개선사항**
- 🔄 **워크플로우 기반 AI**: LangGraph로 병렬 처리 및 조건부 라우팅
- ⚡ **Qwen 2.5 0.5B**: 빠른 응답 속도 (0.5-1초)
- 🧠 **지능적 확인**: 신뢰도 기반 사용자 확인 요청
- 📊 **실시간 분석**: 워크플로우 각 단계별 성능 모니터링

## 🚀 주요 기능

### 🤖 AI 기반 기능
- **자연어 할 일 등록**: "다음 주 화요일에 프로젝트 제안서 관련해서 김철수 씨에게 전화하기"
- **자동 정보 추출**: 할 일, 마감일, 관련 인물, 내용 등 핵심 정보 자동 추출
- **우선순위 제안**: AI 기반 작업 우선순위 자동 추천
- **프로젝트 인사이트**: 진행 상황 분석 및 지연 작업 알림

### 🔍 강력한 검색
- **Elasticsearch 기반**: 할 일 내용, 태그, 설명 등 빠른 검색
- **스마트 필터링**: 상태, 우선순위, 프로젝트별 필터링
- **자동완성**: 검색 키워드 제안

### 📊 프로젝트 관리
- **진행 상황 추적**: 실시간 프로젝트 완료율 및 통계
- **협업 지원**: 프로젝트 협력자 관리
- **AI 리포트**: 프로젝트 위험 요소 및 개선 제안

## 🛠️ 기술 스택

- **Backend Framework**: NestJS (Node.js)
- **Database**: MongoDB (Mongoose ODM)
- **Search Engine**: Elasticsearch
- **Queue/Cache**: Redis + Bull Queue
- **AI/ML**: Langchain + Ollama (Local LLM)
- **Authentication**: JWT + Passport
- **Validation**: Class Validator
- **Documentation**: Swagger/OpenAPI

## 📋 사전 요구사항

- Node.js (v18 이상)
- Docker & Docker Compose
- Ollama (로컬 LLM 서버)

## 🚀 **빠른 시작 (LangGraph)**

```bash
# 1. LangGraph 통합 버전 실행
chmod +x start-langgraph.sh
./start-langgraph.sh

# 2. 또는 수동 실행
docker compose up -d mongodb elasticsearch redis ollama
docker exec taskmind-ollama ollama pull qwen2.5:0.5b
npm run start:dev
```

### **LangGraph 워크플로우 테스트**
```bash
# API 테스트
curl -X POST http://localhost:3000/api/ai/test-workflow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"input": "내일까지 김팀장님께 보고서 제출하기"}'

# 응답 예시
{
  "input": "내일까지 김팀장님께 보고서 제출하기",
  "result": {
    "title": "김팀장님께 보고서 제출하기",
    "dueDate": "2024-06-01",
    "priority": "high",
    "confidence": 0.85,
    "needsConfirmation": false
  },
  "processingTime": "680ms",
  "model": "qwen2.5:0.5b",
  "workflow": "LangGraph"
}
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값들을 설정하세요:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/taskmind-ai

# Elasticsearch Configuration
ELASTICSEARCH_NODE=http://localhost:9200

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# Application Configuration
PORT=3000
NODE_ENV=development
```

### 3. Ollama 및 인프라 서비스 실행 (Docker Compose)

```bash
# MongoDB, Elasticsearch, Redis, Ollama 실행
docker-compose up -d mongodb elasticsearch redis ollama

# Ollama에 모델 다운로드 (최초 실행 시)
docker exec taskmind-ollama ollama pull llama3.1
```

### 4. 애플리케이션 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

## 📡 API 엔드포인트

### 🔐 인증
- `POST /api/auth/register` - 사용자 등록
- `POST /api/auth/login` - 로그인

### 📝 할 일 관리
- `POST /api/tasks` - 새 할 일 생성
- `POST /api/tasks/natural-language` - 자연어로 할 일 생성
- `GET /api/tasks` - 할 일 목록 조회
- `GET /api/tasks/stats` - 할 일 통계
- `GET /api/tasks/overdue` - 연체된 할 일
- `PATCH /api/tasks/:id` - 할 일 수정
- `DELETE /api/tasks/:id` - 할 일 삭제

### 📁 프로젝트 관리
- `POST /api/projects` - 새 프로젝트 생성
- `GET /api/projects` - 프로젝트 목록
- `GET /api/projects/:id/insights` - AI 프로젝트 인사이트
- `GET /api/projects/:id/stats` - 프로젝트 통계
- `PATCH /api/projects/:id` - 프로젝트 수정

### 🔤 AI 질문 답변
- `POST /api/ai/ask` - AI에게 질문하기
- `GET /api/search?q=검색어` - 통합 검색
- `GET /api/search/tasks?q=검색어` - 할 일 검색
- `GET /api/search/projects?q=검색어` - 프로젝트 검색

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

## 🐳 Docker로 전체 스택 실행

```bash
# 모든 서비스 (백엔드 포함) 실행
docker-compose --profile production up -d

# 인프라만 실행 (개발용)
docker-compose up -d mongodb elasticsearch redis ollama
```

## 🤖 AI 기능 사용 예시

### 자연어 할 일 등록

```javascript
// POST /api/tasks/natural-language
{
  "input": "다음 주 화요일까지 프로젝트 제안서를 김철수 팀장님께 이메일로 보내기"
}

// Ollama AI가 자동으로 추출하는 정보:
// - title: "프로젝트 제안서를 김철수 팀장님께 이메일로 보내기"
// - dueDate: "2024-06-04" (다음 주 화요일)
// - priority: "high"
// - tags: ["이메일", "제안서"]
// - extractedEntities: { people: ["김철수"] }
```

### AI 질문 답변

```javascript
// POST /api/ai/ask
{
  "question": "오늘 해야 할 가장 중요한 작업은 무엇인가요?",
  "context": "현재 5개의 작업이 있고, 그 중 2개가 오늘 마감입니다."
}

// 응답:
{
  "question": "오늘 해야 할 가장 중요한 작업은 무엇인가요?",
  "answer": "오늘 마감인 2개의 작업을 우선적으로 처리하시는 것이 좋겠습니다. 마감일이 임박한 작업들을 먼저 완료하여 일정을 준수하시기 바랍니다.",
  "timestamp": "2024-05-29T14:30:00.000Z"
}
```

### AI 우선순위 제안

```javascript
// GET /api/tasks/:id/suggest-priority
{
  "priority": "high",
  "reasoning": "이메일 발송은 빠른 처리가 가능하며, 팀장님께 보내는 제안서는 중요한 업무입니다."
}
```

### 프로젝트 AI 인사이트

```javascript
// GET /api/projects/:id/insights
{
  "summary": "프로젝트는 순조롭게 진행되고 있으나 몇 가지 지연 요소가 있습니다.",
  "risks": [
    "3개의 작업이 마감일을 초과했습니다",
    "핵심 작업의 의존성 체인이 길어 병목 현상 가능성이 있습니다"
  ],
  "suggestions": [
    "연체된 작업들의 우선순위를 재조정해보세요",
    "병렬 처리가 가능한 작업들을 분리하여 진행하세요"
  ],
  "estimatedCompletion": "2024-06-15T00:00:00.000Z"
}
```

## 📊 모니터링 및 로깅

### 애플리케이션 상태 확인
```bash
# 헬스 체크
curl http://localhost:3000/api/health

# Ollama 상태
curl http://localhost:11434/api/tags
curl http://localhost:9200/_cluster/health

# MongoDB 상태
docker exec taskmind-mongodb mongosh --eval "db.adminCommand('ismaster')"
```

### 로그 확인
```bash
# 애플리케이션 로그
npm run start:dev

# Docker 컨테이너 로그
docker-compose logs -f mongodb
docker-compose logs -f elasticsearch
docker-compose logs -f redis
```

## 🔧 개발 도구

### 데이터베이스 스키마 확인
```bash
# MongoDB 컬렉션 확인
docker exec -it taskmind-mongodb mongosh taskmind-ai --eval "show collections"

# 인덱스 확인
docker exec -it taskmind-mongodb mongosh taskmind-ai --eval "db.tasks.getIndexes()"
```

### Elasticsearch 인덱스 관리
```bash
# 인덱스 목록 확인
curl http://localhost:9200/_cat/indices?v

# 매핑 확인
curl http://localhost:9200/tasks/_mapping?pretty

# 검색 테스트
curl -X POST "http://localhost:9200/tasks/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "title": "테스트"
    }
  }
}'
```

## 🚨 트러블슈팅

### 일반적인 문제들

**1. Elasticsearch 연결 오류**
```bash
# Elasticsearch 컨테이너 상태 확인
docker-compose ps elasticsearch

# 로그 확인
docker-compose logs elasticsearch

# 재시작
docker-compose restart elasticsearch
```

**2. MongoDB 연결 오류**
```bash
# MongoDB 컨테이너 확인
docker-compose ps mongodb

# 연결 테스트
docker exec taskmind-mongodb mongosh --eval "db.adminCommand('ping')"
```

**3. Ollama 연결 오류**
```bash
# Ollama 컨테이너 확인
docker-compose ps ollama

# 로그 확인
docker-compose logs ollama

# 모델 다운로드 확인
docker exec taskmind-ollama ollama list

# 모델 다운로드
docker exec taskmind-ollama ollama pull llama3.1
```

**4. 패키지 설치 오류**
```bash
# 캐시 정리 후 재설치
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

문제가 있거나 질문이 있으시면 [이슈](https://github.com/your-repo/taskmind-backend/issues)를 생성해 주세요.

---

### 🔧 **개발 팁**

- 로컬 LLM을 위해 Ollama 서버 실행 필수
- Elasticsearch 인덱스는 첫 실행 시 자동 생성
- Redis는 백그라운드 작업과 캐싱에 사용
- Ollama 모델은 첫 실행 시 자동 다운로드 (시간이 다소 소요될 수 있음)
- llama3.1 모델 외에도 다른 모델 사용 가능 (qwen, mistral, codellama 등)

**TaskMind AI** - 더 스마트한 할 일 관리의 시작 🚀
