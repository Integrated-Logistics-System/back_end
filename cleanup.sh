#!/bin/bash

# RAG 시스템 구축 완료 후 불필요한 파일 정리 스크립트

echo "🧹 불필요한 파일들을 정리합니다..."

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo "❌ package.json을 찾을 수 없습니다. 프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

echo "📁 현재 디렉토리: $(pwd)"

# 1. recommend 폴더의 구 버전 파일들 삭제
echo "1️⃣ recommend 폴더의 구 버전 파일들 삭제..."

if [ -f "src/recommend/recommend.module.new.ts" ]; then
    rm "src/recommend/recommend.module.new.ts"
    echo "✅ recommend.module.new.ts 삭제됨"
fi

if [ -f "src/recommend/recommend.service.new.ts" ]; then
    rm "src/recommend/recommend.service.new.ts"
    echo "✅ recommend.service.new.ts 삭제됨"
fi

if [ -f "src/recommend/recommend.service.old.ts" ]; then
    rm "src/recommend/recommend.service.old.ts"
    echo "✅ recommend.service.old.ts 삭제됨"
fi

# backup 파일도 삭제
if [ -f "src/recommend/recommend.module.new.ts.backup" ]; then
    rm "src/recommend/recommend.module.new.ts.backup"
    echo "✅ recommend.module.new.ts.backup 삭제됨"
fi

# 2. 기존 ollama 및 redis 폴더 삭제 (각각 LLM 모듈과 Cache 모듈로 대체됨)
echo "2️⃣ 기존 ollama 및 redis 폴더 삭제..."

if [ -d "src/ollama" ]; then
    rm -rf "src/ollama"
    echo "✅ src/ollama 폴더 삭제됨 (LLM 모듈로 대체)"
fi

if [ -d "src/redis" ]; then
    rm -rf "src/redis"
    echo "✅ src/redis 폴더 삭제됨 (Cache 모듈로 대체)"
fi

# 3. 기타 불필요한 파일들 정리
echo "3️⃣ 기타 불필요한 파일들 정리..."

# TypeScript 컴파일 결과물 정리
if [ -d "dist" ]; then
    rm -rf "dist"
    echo "✅ dist 폴더 삭제됨ΥΥ빌드 시 재생성됨)"
fi

# 임시 파일들 정리
find . -name "*.tmp" -type f -delete 2>/dev/null && echo "✅ 임시 파일들 정리됨"
find . -name "*.log" -type f -delete 2>/dev/null && echo "✅ 로그 파일들 정리됨"
find . -name ".DS_Store" -type f -delete 2>/dev/null && echo "✅ .DS_Store 파일들 정리됨"

# 4. node_modules 재설치 권장사항 출력
echo ""
echo "4️⃣ 의존성 재설치 권장사항:"
echo "   새로운 구조로 변경되었으므로 node_modules를 재설치하는 것을 권장합니다:"
echo "   rm -rf node_modules package-lock.json"
echo "   npm install"

# 5. 최종 상태 체크
echo ""
echo "📊 최종 프로젝트 구조:"
echo "src/"
echo "├── rag/                    # ✅ RAG 핵심 모듈"
echo "├── llm/                    # ✅ LLM 서비스 (Ollama)"
echo "├── retrieval/              # ✅ 데이터 검색 계층"
echo "├── cache/                  # ✅ Redis 캐싱"
echo "├── recommend/              # ✅ 추천 API 엔드포인트"
echo "├── buildings/              # ✅ 기존 건물 모듈"
echo "├── markets/                # ✅ 기존 마켓 모듈"
echo "├── naver/                  # ✅ 네이버 API 모듈"
echo "├── elasticsearch/          # ✅ Elasticsearch 모듈"
echo "└── common/                 # ✅ 공통 모듈"

echo ""
echo "🎉 파일 정리가 완료되었습니다!"
echo ""
echo "🚀 다음 단계:"
echo "1. npm install            # 의존성 재설치"
echo "2. npm run start:dev      # 개발 서버 실행"
echo "3. npm run test:rag       # RAG 시스템 테스트"
echo ""

# 마지막으로 현재 파일 구조 표시
echo "📁 현재 src 폴더 구조:"
if command -v tree >/dev/null 2>&1; then
    tree src/ -I node_modules
else
    find src/ -type d | head -20
fi
