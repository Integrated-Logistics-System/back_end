import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoryUtils {
  private readonly categoryData = [
    {
      category_large: '보건의료',
      categories: [
        {
          category_middle: '의원',
          category_smalls: [
            '기타 의원',
            '성형외과 의원',
            '외과 의원',
            '안과 의원',
            '내과/소아과 의원',
            '이비인후과 의원',
            '산부인과 의원',
            '방사선 진단/병리 검사 의원',
            '신경/정신과 의원',
            '치과의원',
            '한의원',
            '피부/비뇨기과 의원',
          ],
        },
        {
          category_middle: '병원',
          category_smalls: [
            '치과병원',
            '요양병원',
            '한방병원',
            '일반병원',
            '종합병원',
          ],
        },
        {
          category_middle: '기타 보건',
          category_smalls: ['유사 의료업'],
        },
        // ... (rest of the category data) ...
      ],
    },
    {
      category_large: '부동산',
      categories: [
        {
          category_middle: '부동산 서비스',
          category_smalls: ['부동산 중개/대리업'],
        },
      ],
    },
    {
      category_large: '숙박',
      categories: [
        {
          category_middle: '일반 숙박',
          category_smalls: ['캠핑/글램핑', '여관/모텔', '호텔/리조트', '펜션'],
        },
        {
          category_middle: '기타 숙박',
          category_smalls: ['그 외 기타 숙박업', '기숙사/고시원'],
        },
      ],
    },
    {
      category_large: '수리·개인',
      categories: [
        {
          category_middle: '이용·미용',
          category_smalls: ['미용실', '피부 관리실', '네일숍'],
        },
        {
          category_middle: '컴퓨터 수리',
          category_smalls: ['컴퓨터/노트북/프린터 수리업'],
        },
        {
          category_middle: '세탁',
          category_smalls: ['세탁소', '셀프 빨래방'],
        },
        {
          category_middle: '통신장비 수리',
          category_smalls: ['핸드폰/통신장비 수리업'],
        },
        {
          category_middle: '욕탕·신체관리',
          category_smalls: ['마사지/안마', '체형/비만 관리', '목욕탕/사우나'],
        },
        {
          category_middle: '장례식장 ',
          category_smalls: ['화장터/묘지/납골당', '장례식장'],
        },
        {
          category_middle: '자동차 수리·세차',
          category_smalls: ['자동차 세차장', '자동차 정비소'],
        },
        {
          category_middle: '기타 가정용품 수리',
          category_smalls: [
            '시계/귀금속/악기 수리업',
            '그 외 기타 개인/가정용품 수리업',
            '의류/이불 수선업',
            '가죽/가방/신발 수선업',
          ],
        },
        {
          category_middle: '가전제품 수리',
          category_smalls: ['가전제품 수리업'],
        },
        {
          category_middle: '모터사이클 수리',
          category_smalls: ['모터사이클 수리업'],
        },
        {
          category_middle: '기타 개인',
          category_smalls: ['결혼 상담 서비스업', '예식장업'],
        },
      ],
    },
    {
      category_large: '소매',
      categories: [
        {
          category_middle: '기타 상품 소매',
          category_smalls: ['그 외 기타 상품 전문 소매업'],
        },
        {
          category_middle: '연료 소매',
          category_smalls: ['가정용 연료 소매업', '가스 충전소', '주유소'],
        },
        {
          category_middle: '가전·통신 소매',
          category_smalls: [
            '컴퓨터/소프트웨어 소매업',
            '핸드폰 소매업',
            '가전제품 소매업',
          ],
        },
        {
          category_middle: '장식품 소매',
          category_smalls: ['예술품 소매업', '기념품점'],
        },
        {
          category_middle: '시계·귀금속 소매',
          category_smalls: ['시계/귀금속 소매업'],
        },
        {
          category_middle: '자동차 부품 소매',
          category_smalls: ['자동차 부품 소매업', '타이어 소매업'],
        },
        {
          category_middle: '의약·화장품 소매',
          category_smalls: ['약국', '의료기기 소매업', '화장품 소매업'],
        },
        {
          category_middle: '애완동물·용품 소매',
          category_smalls: ['애완동물/애완용품 소매업'],
        },
        {
          category_middle: '모터사이클 소매',
          category_smalls: ['모터사이클 및 부품 소매업'],
        },
        {
          category_middle: '섬유·의복·신발 소매',
          category_smalls: [
            '남성 의류 소매업',
            '여성 의류 소매업',
            '침구류/커튼 소매업',
            '기타 의류 소매업',
            '액세서리/잡화 소매업',
            '신발 소매업',
            '가발 소매업',
            '한복 소매업',
            '유아용 의류 소매업',
            '실/섬유제품 소매업',
            '가방 소매업',
          ],
        },
        {
          category_middle: '중고 상품 소매',
          category_smalls: ['중고 상품 소매업'],
        },
        {
          category_middle: '오락용품 소매',
          category_smalls: [
            '자전거 소매업',
            '문구/회화용품 소매업',
            '서점',
            '장난감 소매업',
            '운동용품 소매업',
            '음반/비디오물 소매업',
          ],
        },
        {
          category_middle: '식료품 소매',
          category_smalls: [
            '건어물/젓갈 소매업',
            '건강보조식품 소매업',
            '곡물/곡분 소매업',
            '정육점',
            '채소/과일 소매업',
            '아이스크림 할인점',
            '가축 사료 소매업',
            '반찬/식료품 소매업',
            '수산물 소매업',
          ],
        },
        {
          category_middle: '음료 소매',
          category_smalls: [
            '생수/음료 소매업',
            '주류 소매업',
            '우유 소매업',
            '얼음 소매업',
          ],
        },
        {
          category_middle: '담배 소매',
          category_smalls: ['담배/전자담배 소매업'],
        },
        {
          category_middle: '안경·정밀기기 소매',
          category_smalls: [
            '사무기기 소매업',
            '안경렌즈 소매업',
            '사진기/기타 광학기기 소매업',
          ],
        },
        {
          category_middle: '종합 소매',
          category_smalls: ['그 외 기타 종합 소매업', '편의점', '슈퍼마켓'],
        },
        {
          category_middle: '가구 소매',
          category_smalls: ['가구 소매업'],
        },
        {
          category_middle: '식물 소매',
          category_smalls: ['꽃집'],
        },
        {
          category_middle: '기타 생활용품 소매',
          category_smalls: [
            '악기 소매업',
            '주방/가정용품 소매업',
            '전기용품/조명장치 소매업',
          ],
        },
        {
          category_middle: '철물·건설자재 소매',
          category_smalls: [
            '기타 건설/건축자재 소매업',
            '건설/건축자재 소매업',
            '철물/공구 소매업',
            '벽지/장판/마루 소매업',
          ],
        },
      ],
    },
    {
      category_large: '음식',
      categories: [
        {
          category_middle: '주점',
          category_smalls: [
            '요리 주점',
            '생맥주 전문',
            '무도 유흥 주점',
            '일반 유흥 주점',
          ],
        },
        {
          category_middle: '기타 외국',
          category_smalls: ['분류 안된 외국식 음식점'],
        },
        {
          category_middle: '서양식',
          category_smalls: [
            '파스타/스테이크',
            '경양식',
            '패밀리레스토랑',
            '기타 서양식 음식점',
          ],
        },
        {
          category_middle: '일식',
          category_smalls: [
            '기타 일식 음식점',
            '일식 면 요리',
            '일식 카레/돈가스/덮밥',
            '일식 회/초밥',
          ],
        },
        {
          category_middle: '기타 간이',
          category_smalls: [
            '치킨',
            '토스트/샌드위치/샐러드',
            '그 외 기타 간이 음식점',
            '아이스크림/빙수',
            '버거',
            '피자',
            '떡/한과',
            '김밥/만두/분식',
            '빵/도넛',
          ],
        },
        {
          category_middle: '중식',
          category_smalls: ['중국집', '마라탕/훠궈'],
        },
        {
          category_middle: '동남아시아',
          category_smalls: ['베트남식 전문', '기타 동남아식 전문'],
        },
        {
          category_middle: '한식',
          category_smalls: [
            '닭/오리고기 구이/찜',
            '소고기 구이/찜',
            '기타 한식 음식점',
            '족발/보쌈',
            '횟집',
            '냉면/밀면',
            '국수/칼국수',
            '복 요리 전문',
            '곱창 전골/구이',
            '백반/한정식',
            '국/탕/찌개류',
            '해산물 구이/찜',
            '전/부침개',
            '돼지고기 구이/찜',
          ],
        },
        {
          category_middle: '구내식당·뷔페',
          category_smalls: ['구내식당', '뷔페'],
        },
        {
          category_middle: '비알코올 ',
          category_smalls: ['카페'],
        },
      ],
    },
    {
      category_large: '예술·스포츠',
      categories: [
        {
          category_middle: '도서관·사적지',
          category_smalls: ['독서실/스터디 카페'],
        },
        {
          category_middle: '유원지·오락',
          category_smalls: [
            '수상/해양 레저업',
            '노래방',
            '기타 오락장',
            '바둑/장기/체스 경기 운영업',
            '낚시터 운영업',
            '기타 오락관련 서비스업',
            'PC방',
            '전자 게임장',
            '복권 발행/판매업',
            '비디오방',
          ],
        },
        {
          category_middle: '스포츠 서비스',
          category_smalls: [
            '당구장',
            '스쿼시/라켓볼장',
            '테니스장',
            '탁구장',
            '헬스장',
            '기타 스포츠시설 운영업',
            '수영장',
            '종합 스포츠시설',
            '골프 연습장',
            '볼링장',
          ],
        },
      ],
    },
    {
      category_large: '교육',
      categories: [
        {
          category_middle: '기타 교육',
          category_smalls: [
            '요가/필라테스 학원',
            '컴퓨터 학원',
            '음악학원',
            '운전학원',
            '기타 예술/스포츠 교육기관',
            '사회교육시설',
            '청소년 수련시설',
            '외국어학원',
            '미술학원',
            '직원 훈련기관',
            '태권도/무술학원',
            '기타 기술/직업 훈련학원',
            '전문자격/고시학원',
            '레크리에이션 교육기관',
            '그 외 기타 교육기관',
          ],
        },
        {
          category_middle: '교육 지원',
          category_smalls: ['교육컨설팅업', '기타 교육지원 서비스업'],
        },
        {
          category_middle: '일반 교육',
          category_smalls: ['입시·교과학원'],
        },
      ],
    },
    {
      category_large: '과학·기술',
      categories: [
        {
          category_middle: '시장 조사',
          category_smalls: ['시장 조사 및 여론 조사업'],
        },
        {
          category_middle: '인쇄·제품제작',
          category_smalls: ['명함/간판/광고물 제작'],
        },
        {
          category_middle: '기술 서비스',
          category_smalls: [
            '기타 엔지니어링 서비스업',
            '환경 관련 엔지니어링 서비스업',
            '건물 및 토목 엔지니어링 서비스업',
            '도시 계획 및 조경 설계 서비스업',
            '건축 설계 및 관련 서비스업',
          ],
        },
        {
          category_middle: '회계·세무',
          category_smalls: ['세무사', '기타 회계 관련 서비스업', '공인회계사'],
        },
        {
          category_middle: '수의',
          category_smalls: ['동물병원'],
        },
        {
          category_middle: '법무관련 ',
          category_smalls: [
            '변호사',
            '기타 법무관련 서비스업',
            '행정사',
            '공인노무사',
            '변리사',
            '법무사',
          ],
        },
        {
          category_middle: '전문 디자인',
          category_smalls: [
            '패션/섬유/기타 전문 디자인업',
            '인테리어 디자인업',
            '제품 디자인업',
            '시각 디자인업',
          ],
        },
        {
          category_middle: '광고',
          category_smalls: [
            '옥외/전시 광고 대행업',
            '광고 대행업',
            '광고물 설계/제작업',
            '기타 광고 관련 서비스업',
            '광고 매체 판매업',
          ],
        },
        {
          category_middle: '사진 촬영',
          category_smalls: ['사진촬영업'],
        },
        {
          category_middle: '기타 전문 과학',
          category_smalls: ['사업/무형 재산권 중개업', '번역/통역 서비스업'],
        },
        {
          category_middle: '본사·경영 컨설팅',
          category_smalls: ['경영 컨설팅업'],
        },
      ],
    },
    {
      category_large: '시설관리·임대',
      categories: [
        {
          category_middle: '시설관리',
          category_smalls: ['사업시설 유지·관리 서비스업'],
        },
        {
          category_middle: '산업용품 대여',
          category_smalls: [
            '컴퓨터/사무기기 대여업',
            '건설기계/장비 대여업',
            '기타 산업용 기계/장비 대여업',
          ],
        },
        {
          category_middle: '고용 알선',
          category_smalls: [
            '고용 알선업',
            '임시/일용 인력 공급업',
            '상용 인력 공급 및 인사관리 서비스업',
          ],
        },
        {
          category_middle: '기타 사업 서비스',
          category_smalls: ['포장/충전업', '전시/컨벤션/행사 대행 서비스업'],
        },
        {
          category_middle: '청소·방제',
          category_smalls: [
            '산업설비; 운송장비 및 공공장소 청소업',
            '소독; 구충 및 방제 서비스업',
            '건축물 일반 청소업',
          ],
        },
        {
          category_middle: '여행사·보조',
          category_smalls: ['여행사', '기타 여행 보조/예약 서비스업'],
        },
        {
          category_middle: '가정용품 대여',
          category_smalls: [
            '음반/비디오물 대여업',
            '만화방',
            '의류 대여업',
            '스포츠/레크리에이션 용품 대여업',
            '기타 개인/가정용품 대여업',
          ],
        },
        {
          category_middle: '사무 지원',
          category_smalls: ['기타 사무 지원 서비스업', '복사업'],
        },
        {
          category_middle: '조경·유지',
          category_smalls: ['조경 유지·관리 서비스업'],
        },
        {
          category_middle: '운송장비 대여',
          category_smalls: ['기타 운송장비 대여업', '자동차 대여업'],
        },
      ],
    },
  ];

  /**
   * 모든 소분류 카테고리 목록을 반환합니다.
   */
  getAllSmallCategories(): string[] {
    const smallCategories: string[] = [];

    this.categoryData.forEach((largeCategory) => {
      largeCategory.categories.forEach((middleCategory) => {
        smallCategories.push(...middleCategory.category_smalls);
      });
    });

    // 중복 제거 (필요시)
    return [...new Set(smallCategories)];
  }

  /**
   * 카테고리 매핑을 반환합니다.
   * 예: { '카페': '비알코올', '스타벅스': '비알코올', ... }
   */
  getCategoryMapping(): Record<string, string> {
    const mapping: Record<string, string> = {};

    this.categoryData.forEach((largeCategory) => {
      largeCategory.categories.forEach((middleCategory) => {
        middleCategory.category_smalls.forEach((smallCategory) => {
          mapping[smallCategory] = middleCategory.category_middle;
        });
      });
    });

    return mapping;
  }

  /**
   * 입력된 텍스트에서 가장 유사한 소분류 카테고리를 찾습니다.
   */
  findMostSimilarCategory(input: string): string | null {
    if (!input) return null;

    const smallCategories = this.getAllSmallCategories();
    const normalizedInput = this.normalizeText(input);

    // 정확히 일치하는 카테고리가 있는지 확인
    const exactMatch = smallCategories.find(
      (category) => this.normalizeText(category) === normalizedInput,
    );
    if (exactMatch) return exactMatch;

    // 부분 일치하는 카테고리 찾기
    const partialMatches = smallCategories.filter((category) =>
      this.normalizeText(category).includes(normalizedInput),
    );

    // 가장 짧은 카테고리를 반환 (더 구체적인 카테고리일 가능성이 높음)
    if (partialMatches.length > 0) {
      return partialMatches.sort((a, b) => a.length - b.length)[0];
    }

    return null;
  }

  /**
   * 텍스트를 정규화합니다 (비교를 위해).
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\s\-/]/g, '')
      .trim();
  }
}
