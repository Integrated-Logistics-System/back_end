#!/usr/bin/env node

const { Client } = require('@elastic/elasticsearch');

const client = new Client({ 
  node: 'http://192.168.0.111:9200',
  requestTimeout: 10000,
  maxRetries: 3
});

async function investigateElasticsearchData() {
  console.log('🔍 Elasticsearch 데이터 조사 시작...\n');

  try {
    // 1. 연결 테스트
    console.log('🔗 연결 테스트...');
    const health = await client.cluster.health();
    console.log(`클러스터 상태: ${health.body.status}`);
    console.log('');

    // 2. 인덱스 목록 확인
    console.log('📋 인덱스 목록:');
    try {
      const indices = await client.cat.indices({ format: 'json' });
      if (indices && indices.body && Array.isArray(indices.body)) {
        indices.body.forEach(index => {
          console.log(`  - ${index.index}: ${index['docs.count']}개 문서`);
        });
      } else {
        console.log('인덱스 목록을 가져올 수 없습니다.');
      }
    } catch (error) {
      console.log('인덱스 목록 조회 실패:', error.message);
    }
    console.log('');

    // 3. 특정 인덱스 존재 확인
    const indices = ['buildings_seoul_index', 'shops_seoul_index'];
    
    for (const index of indices) {
      console.log(`🔍 ${index} 조사:`);
      
      try {
        const exists = await client.indices.exists({ index });
        if (!exists.body) {
          console.log(`  ❌ ${index} 인덱스가 존재하지 않습니다.`);
          continue;
        }
        
        console.log(`  ✅ ${index} 인덱스 존재`);
        
        // 문서 수 확인
        const count = await client.count({ index });
        console.log(`  📊 문서 수: ${count.body.count}개`);
        
        // 매핑 구조 확인
        const mapping = await client.indices.getMapping({ index });
        const properties = mapping.body[index]?.mappings?.properties || {};
        console.log(`  🗂️  필드 목록: ${Object.keys(properties).join(', ')}`);
        
        // 샘플 데이터 1개 조회
        const sample = await client.search({
          index,
          body: {
            query: { match_all: {} },
            size: 1
          }
        });
        
        if (sample.body.hits.hits.length > 0) {
          console.log(`  📄 샘플 데이터:`);
          const sampleDoc = sample.body.hits.hits[0]._source;
          Object.keys(sampleDoc).forEach(key => {
            const value = sampleDoc[key];
            const displayValue = typeof value === 'string' && value.length > 50 
              ? value.substring(0, 50) + '...' 
              : value;
            console.log(`    ${key}: ${displayValue}`);
          });
        }
        
      } catch (error) {
        console.log(`  ❌ ${index} 조사 실패:`, error.message);
      }
      
      console.log('');
    }

    // 4. 위치 기반 검색 테스트
    console.log('📍 위치 기반 검색 테스트 (마포구):');
    
    for (const index of indices) {
      try {
        const exists = await client.indices.exists({ index });
        if (!exists.body) continue;
        
        const searchResult = await client.search({
          index,
          body: {
            query: {
              multi_match: {
                query: '마포구',
                fields: ['*']
              }
            },
            size: 3
          }
        });
        
        console.log(`  ${index}: ${searchResult.body.hits.total.value}개 매치`);
        searchResult.body.hits.hits.forEach((hit, i) => {
          const source = hit._source;
          console.log(`    [${i+1}] ID: ${hit._id}, Score: ${hit._score}`);
        });
        
      } catch (error) {
        console.log(`  ${index} 검색 실패:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ 전체 오류 발생:', error.message);
    if (error.meta?.body) {
      console.error('상세 오류:', JSON.stringify(error.meta.body, null, 2));
    }
  }
}

// 실행
investigateElasticsearchData().then(() => {
  console.log('\n✅ 조사 완료!');
  process.exit(0);
}).catch(error => {
  console.error('💥 스크립트 실행 오류:', error);
  process.exit(1);
});
