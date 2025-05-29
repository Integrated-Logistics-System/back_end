#!/bin/bash

# Ollama 모델 설정 스크립트
echo "🤖 TaskMind AI - Ollama 모델 설정을 시작합니다..."

# Ollama 컨테이너가 실행 중인지 확인
if ! docker-compose ps ollama | grep -q "Up"; then
    echo "❌ Ollama 컨테이너가 실행되지 않았습니다. 먼저 다음 명령어를 실행하세요:"
    echo "   docker-compose up -d ollama"
    exit 1
fi

echo "✅ Ollama 컨테이너가 실행 중입니다."

# 모델 다운로드
echo "📥 llama3.1 모델을 다운로드합니다..."
docker exec taskmind-ollama ollama pull llama3.1

# 선택적으로 다른 유용한 모델들도 다운로드
echo "📥 추가 모델을 다운로드하시겠습니까? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "📥 qwen2.5 모델을 다운로드합니다..."
    docker exec taskmind-ollama ollama pull qwen2.5:7b
    
    echo "📥 mistral 모델을 다운로드합니다..."
    docker exec taskmind-ollama ollama pull mistral:7b
fi

# 다운로드된 모델 목록 확인
echo "📋 다운로드된 모델 목록:"
docker exec taskmind-ollama ollama list

echo "🎉 Ollama 모델 설정이 완료되었습니다!"
echo "🚀 이제 TaskMind AI를 실행할 수 있습니다: npm run start:dev"
