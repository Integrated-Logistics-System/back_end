import { PromptTemplate } from '@langchain/core/prompts';

// 자연어 파싱용 프롬프트
export const QUERY_PARSING_PROMPT = PromptTemplate.fromTemplate(`
아래 문장에서 다음 정보를 추출해주세요:
1. 도로명 주소 (예: 서울시 마포구 마포대로 10길 22)
2. 업종 카테고리 (예: 소고기 구이/찜, 카페 등)
3. 반경 (숫자 + km/m/킬로미터/미터/키로 등이 포함된 경우)

문장: "{query}"

반드시 다음 JSON 형식으로 응답해주세요:
{{
  "address": "추출된 주소",
  "category": "추출된 카테고리", 
  "radius": 숫자 (반경이 없을 경우 null, km 단위로 변환)
}}

예시1:
입력: "서울시 마포구 마포대로 10길 22에 소고기 구이/찜 음식점 차릴건데 3km 반경으로 건물을 추천해줘"
출력: {{"address": "서울시 마포구 마포대로 10길 22", "category": "소고기 구이/찜", "radius": 3}}

예시2:
입력: "강남역 근처에 카페 열고 싶어"
출력: {{"address": "강남역", "category": "카페", "radius": null}}
`);

// RAG 추천 생성용 프롬프트
export const RECOMMENDATION_PROMPT = PromptTemplate.fromTemplate(`
당신은 창업 입지 분석 전문가입니다. 다음 정보를 바탕으로 최적의 창업 위치를 추천해주세요.

**사용자 요청:**
- 업종: {category}
- 위치: {address} (위도: {latitude}, 경도: {longitude})
- 분석 반경: {radius_min}km ~ {radius_max}km

**주변 상권 분석 데이터:**
{context}

**분석 기준:**
1. 경쟁업체 밀도 분석 (적정 경쟁 vs 과열 경쟁)
2. 접근성 및 유동인구
3. 주변 상권 특성 및 시너지 효과
4. 건물 용도의 적합성
5. 임대료 대비 수익성 전망

다음 JSON 형식으로 응답해주세요:
{{
  "building": "추천 건물명",
  "address": "상세 주소", 
  "score": 점수(1-10),
  "reasons": ["추천 이유 1", "추천 이유 2", "추천 이유 3"],
  "analysis": "종합적인 분석 코멘트 (3-5문장)"
}}

**중요**: 반드시 위의 JSON 형식으로만 응답하세요.
`);

// 컨텍스트 생성용 프롬프트
export const CONTEXT_GENERATION_PROMPT = PromptTemplate.fromTemplate(`
다음 검색된 데이터를 분석하여 창업 입지 추천을 위한 컨텍스트를 생성하세요:

**검색된 상가 정보 ({shops_count}개):**
{shops_data}

**검색된 건물 정보 ({buildings_count}개):**
{buildings_data}

**요청 정보:**
- 업종: {category}
- 중심 좌표: {latitude}, {longitude}

위 정보를 바탕으로 다음 형식으로 요약해주세요:

1. **경쟁업체 현황**
   - 총 {shops_count}개 상가 발견
   - 동일 업종: X개
   - 유사 업종: X개
   - 경쟁 강도: 낮음/보통/높음

2. **주변 건물 현황**
   - 총 {buildings_count}개 건물
   - 상업용 건물: X개
   - 주거/상업 복합: X개
   - 접근성이 좋은 건물: 상위 3개 추천

3. **상권 특성**
   - 주요 업종 분포
   - 예상 유동인구 수준
   - 창업 적합도 평가
`);
