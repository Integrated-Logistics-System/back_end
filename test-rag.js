#!/usr/bin/env node

/**
 * RAG 시스템 간단 테스트 스크립트
 * 
 * 사용법:
 *   npm run start:dev 실행 후
 *   node test-rag.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testRAGSystem() {
  console.log('🚀 RAG 시스템 테스트 시작\n');

  try {
    // 1. 헬스체크
    console.log('1️⃣ 시스템 상태 확인...');
    const healthResponse = await axios.get(`${BASE_URL}/recommend/health`);
    console.log('✅ 시스템 상태:', healthResponse.data);
    console.log('');

    // 2. 간단한 테스트 요청
    console.log('2️⃣ 간단한 테스트 요청...');
    const testResponse = await axios.get(`${BASE_URL}/recommend/test?query=강남역 카페`);
    console.log('✅ 테스트 응답:');
    console.log(JSON.stringify(testResponse.data, null, 2));
    console.log('');

    // 3. 실제 추천 요청들
    const testQueries = [
      '홍대입구역 근처 치킨집 창업하고 싶어요',
      '마포구에서 카페 열기 좋은 곳 추천해주세요',
      '신촌역 1km 내 음식점 추천',
      '이태원에서 서점 창업 어떨까요?'
    ];

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`${i + 3}️⃣ 추천 요청: "${query}"`);
      
      try {
        const response = await axios.post(`${BASE_URL}/recommend`, {
          text: query
        });

        console.log('✅ 추천 결과:');
        console.log(`   📍 위치: ${response.data.recommendation.address}`);
        console.log(`   🏢 건물: ${response.data.recommendation.building}`);
        console.log(`   ⭐ 점수: ${response.data.recommendation.score}/10`);
        console.log(`   💡 이유: ${response.data.recommendation.reasons.join(', ')}`);
        console.log(`   🤖 LLM 코멘트: ${response.data.llm_comment}`);
        console.log('');
        
        // API 과부하 방지를 위한 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log('❌ 요청 실패:', error.response?.data || error.message);
        console.log('');
      }
    }

    console.log('🎉 RAG 시스템 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 해결방법:');
      console.log('   1. 서버가 실행 중인지 확인: npm run start:dev');
      console.log('   2. 포트 3000이 사용 가능한지 확인');
      console.log('   3. Ollama 서버가 실행 중인지 확인 (http://192.168.0.111:11434)');
    }
  }
}

// 성능 측정 wrapper
async function measurePerformance() {
  const startTime = Date.now();
  
  await testRAGSystem();
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log(`\n⏱️  전체 테스트 시간: ${totalTime}ms (${(totalTime/1000).toFixed(2)}초)`);
}

// 실행
measurePerformance().catch(console.error);
