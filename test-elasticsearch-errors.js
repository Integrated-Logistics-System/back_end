#!/usr/bin/env node

const axios = require('axios');

async function testElasticsearchIntegration() {
  console.log('🧪 Elasticsearch 통합 에러 테스트\n');

  const BASE_URL = 'http://localhost:3000';

  try {
    // 1. 헬스체크 테스트
    console.log('1. 헬스체크 테스트...');
    const healthResponse = await axios.get(`${BASE_URL}/recommend/health`);
    console.log('✅ 헬스체크 성공:', healthResponse.data.status);

    // 2. 간단한 추천 테스트
    console.log('\n2. 간단 추천 테스트...');
    const testResponse = await axios.get(`${BASE_URL}/recommend/test?query=마포구 카페`);
    console.log('✅ 간단 테스트 성공');
    console.log('카테고리:', testResponse.data.category);

    // 3. 실제 데이터 검색 테스트
    console.log('\n3. 실제 데이터 검색 테스트...');
    const realDataResponse = await axios.post(`${BASE_URL}/recommend`, {
      text: '서울특별시 마포구 만리재로 23에 카페 열고 싶어요'
    });
    console.log('✅ 실제 데이터 검색 성공');
    console.log('추천 점수:', realDataResponse.data.recommendation?.score);
    console.log('추천 건물:', realDataResponse.data.recommendation?.building);

    console.log('\n🎉 모든 테스트 통과!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.response?.data) {
      console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// 실행
testElasticsearchIntegration();
