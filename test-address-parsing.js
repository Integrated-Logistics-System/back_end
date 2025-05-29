#!/usr/bin/env node

// 주소 파싱 테스트 스크립트
const testCases = [
  "서울특별시 마포구 만리재로 23에 카페 열고 싶어요",
  "마포구 만리재로 23 근처에 음식점 추천해주세요", 
  "강남역 근처에 치킨집 하고 싶어요",
  "홍대입구역에서 서점 창업하려고 해요",
  "마포구에 편의점 열 수 있을까요?",
  "서울시 강남구 테헤란로 123번지 주변 상권 분석해주세요"
];

console.log('=== 주소 파싱 테스트 케이스 ===\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. 입력: "${testCase}"`);
  console.log(`   기대결과: 전체 주소가 정확히 추출되어야 함\n`);
});

console.log('=== API 테스트 명령어 ===');
console.log('curl -X POST http://localhost:3000/recommend \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"text": "서울특별시 마포구 만리재로 23에 카페 열고 싶어요"}\'');
