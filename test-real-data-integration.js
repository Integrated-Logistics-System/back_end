#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testRealDataIntegration() {
  console.log('🚀 실제 Elasticsearch 데이터 연동 테스트 시작\n');

  const testCases = [
    {
      name: '마포구 만리재로 상세 주소 테스트',
      query: '서울특별시 마포구 만리재로 23에 카페 열고 싶어요',
      expected: ['마포구', '만리재로', '카페']
    },
    {
      name: '강남역 근처 음식점 테스트',
      query: '강남역 근처에 치킨집 하고 싶어요',
      expected: ['강남역', '치킨']
    },
    {
      name: '홍대 카페 테스트',
      query: '홍대입구역에서 카페 창업하려고 해요',
      expected: ['홍대', '카페']
    }
  ];

  console.log('📋 테스트 케이스:');
  testCases.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}`);
    console.log(`   입력: "${test.query}"`);
    console.log(`   기대: ${test.expected.join(', ')}\n`);
  });

  // 1. 헬스체크
  console.log('🔍 1. 시스템 헬스체크...');
  try {
    const healthResponse = await axios.get(`${BASE_URL}/recommend/health`);
    console.log('✅ 헬스체크 성공:', healthResponse.data.status);
    console.log('   구성요소:', JSON.stringify(healthResponse.data.components, null, 2));
  } catch (error) {
    console.log('❌ 헬스체크 실패:', error.message);
    return;
  }

  console.log('');

  // 2. 각 테스트 케이스 실행
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`🧪 ${i + 2}. ${testCase.name} 실행...`);
    
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${BASE_URL}/recommend`, {
        text: testCase.query
      }, {
        timeout: 30000 // 30초 타임아웃
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ 응답 성공 (${duration}ms)`);
      console.log('📊 결과 요약:');
      console.log(`   입력 좌표: ${response.data.input_latitude}, ${response.data.input_longitude}`);
      console.log(`   검색 반경: ${response.data.radius_min_meters}m - ${response.data.radius_max_meters}m`);
      console.log(`   카테고리: ${response.data.category}`);
      
      if (response.data.recommendation) {
        console.log('🏢 추천 결과:');
        console.log(`   건물: ${response.data.recommendation.building}`);
        console.log(`   주소: ${response.data.recommendation.address}`);
        console.log(`   점수: ${response.data.recommendation.score}/10`);
        console.log(`   이유: ${response.data.recommendation.reasons?.join(', ')}`);
      }
      
      if (response.data.llm_comment) {
        console.log('💬 AI 코멘트:');
        console.log(`   ${response.data.llm_comment}`);
      }

    } catch (error) {
      console.log(`❌ 테스트 실패: ${error.message}`);
      if (error.response?.data) {
        console.log('   상세 오류:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('');
  }

  // 3. 간단한 테스트 API 확인
  console.log('🔬 3. 간단 테스트 API 확인...');
  try {
    const testResponse = await axios.get(`${BASE_URL}/recommend/test?query=마포구 카페`);
    console.log('✅ 간단 테스트 성공');
    console.log('📋 결과:', {
      category: testResponse.data.category,
      building: testResponse.data.recommendation?.building,
      score: testResponse.data.recommendation?.score
    });
  } catch (error) {
    console.log('❌ 간단 테스트 실패:', error.message);
  }

  console.log('\n🎉 실제 데이터 연동 테스트 완료!');
  console.log('\n📝 확인사항:');
  console.log('- Elasticsearch에서 실제 건물/상가 데이터 검색');
  console.log('- 상세 주소 파싱 정확도');
  console.log('- LLM 기반 추천 품질');
  console.log('- 응답 시간 및 안정성');
}

// 실행
testRealDataIntegration().catch(error => {
  console.error('💥 테스트 스크립트 오류:', error);
  process.exit(1);
});
