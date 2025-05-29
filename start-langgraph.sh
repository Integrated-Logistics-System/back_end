#!/bin/bash

# TaskMind AI with LangGraph - 실행 스크립트

echo "🚀 TaskMind AI with LangGraph 시작..."

# 1. Docker 상태 확인
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker가 실행되지 않았습니다. Docker Desktop을 시작해주세요."
    exit 1
fi

# 2. 인프라 서비스 실행
echo "📦 인프라 서비스 시작 중..."
docker compose up -d mongodb elasticsearch redis ollama

# 3. Ollama 서비스 대기
echo "⏳ Ollama 서비스 준비 중..."
sleep 10

# 4. Qwen 모델 다운로드 (없으면)
echo "🤖 Qwen 2.5 0.5B 모델 확인 중..."
if ! docker exec taskmind-ollama ollama list | grep -q "qwen2.5:0.5b"; then
    echo "📥 Qwen 2.5 0.5B 모델 다운로드 중... (약 400MB)"
    docker exec taskmind-ollama ollama pull qwen2.5:0.5b
else
    echo "✅ Qwen 2.5 0.5B 모델이 이미 설치되어 있습니다."
fi

# 5. 백엔드 서버 실행
echo "🖥️  TaskMind AI 백엔드 시작..."
npm run start:dev

echo "🎉 TaskMind AI with LangGraph가 실행되었습니다!"
echo "📍 API: http://localhost:3000/api"
echo "🤖 Model: Qwen 2.5 0.5B (LangGraph 워크플로우)"
