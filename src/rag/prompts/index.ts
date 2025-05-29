import { PromptTemplate } from '@langchain/core/prompts';

/**
 * 사용자 질의를 분석하여 구조화된 검색 쿼리로 변환하는 프롬프트
 */
export const QUERY_PARSING_PROMPT = new PromptTemplate({
  inputVariables: ['userQuery'],
  template: `
당신은 창업 컨설턴트입니다. 사용자의 질의를 분석하여 위치 기반 창업 자리 추천에 필요한 정보를 추출해주세요.

사용자 질의: "{userQuery}"

다음 JSON 형식으로 응답해주세요:
{{
  "location": "추출된 위치명 (예: 강남역, 홍대입구역, 마포구)",
  "category": "업종 카테고리 (예: 카페, 음식점, 서점, 편의점)",
  "radius": 검색 반경(미터 단위, 기본값: 1000),
  "requirements": ["특별 요구사항들"]
}}

추출 규칙:
1. 위치가 명확하지 않으면 "서울시청"을 기본값으로 사용
2. 카테고리가 없으면 "일반음식점"을 기본값으로 사용  
3. 반경이 명시되지 않으면 1000미터를 기본값으로 사용
4. "근처", "주변"은 1000m, "가까운"은 500m, "멀리"는 2000m로 해석
5. 특별 요구사항이 있으면 requirements 배열에 추가

JSON만 응답하고 다른 설명은 포함하지 마세요.
`,
});

/**
 * 검색된 데이터를 바탕으로 창업 자리를 추천하는 프롬프트
 */
export const RECOMMENDATION_PROMPT = new PromptTemplate({
  inputVariables: ['userQuery', 'retrievedDocs', 'locationInfo'],
  template: `
당신은 전문 창업 컨설턴트입니다. 사용자의 질의와 검색된 데이터를 바탕으로 최적의 창업 자리를 추천해주세요.

사용자 질의: "{userQuery}"

위치 정보:
{locationInfo}

검색된 상가/건물 데이터:
{retrievedDocs}

위 정보를 종합적으로 분석하여 다음 JSON 형식으로 추천 결과를 제공해주세요:

{{
  "recommendation": {{
    "building": "구체적인 건물명 또는 상가명",
    "address": "상세 주소",
    "score": 점수(1-10 범위의 실수),
    "reasons": [
      "추천 이유 1 (구체적으로)",
      "추천 이유 2 (구체적으로)", 
      "추천 이유 3 (구체적으로)"
    ]
  }},
  "llm_comment": "상세한 분석 및 추천 근거 설명 (2-3문장으로 전문적이고 실용적인 조언)"
}}

추천 시 반드시 고려해야 할 사항:
1. 주변 경쟁업체 밀도 분석
2. 접근성 (지하철, 버스정류장 등 대중교통)
3. 예상 유동인구 패턴 (직장인, 학생, 주민 등)
4. 주변 상권 특성과의 시너지 효과
5. 해당 업종의 성공 가능성

점수 산정 기준:
- 9-10점: 매우 우수한 입지, 높은 성공 확률
- 7-8점: 좋은 입지, 적정한 성공 확률  
- 5-6점: 보통 입지, 신중한 검토 필요
- 3-4점: 위험한 입지, 추천하지 않음
- 1-2점: 매우 위험한 입지

JSON만 응답하고 다른 설명은 포함하지 마세요.
`,
});

/**
 * 위치 분석용 프롬프트 (선택적 사용)
 */
export const LOCATION_ANALYSIS_PROMPT = new PromptTemplate({
  inputVariables: ['location', 'nearbyShops', 'nearbyBuildings'],
  template: `
다음 위치의 창업 환경을 분석해주세요.

분석 위치: {location}

주변 상가 현황:
{nearbyShops}

주변 건물 현황:  
{nearbyBuildings}

다음 관점에서 분석 결과를 JSON으로 제공해주세요:

{{
  "competition_level": "경쟁 강도 (높음/보통/낮음)",
  "foot_traffic": "예상 유동인구 (많음/보통/적음)",
  "accessibility": "접근성 점수 (1-10)",
  "commercial_environment": "상권 특성 분석",
  "recommendations": ["업종별 추천사항"]
}}
`,
});
