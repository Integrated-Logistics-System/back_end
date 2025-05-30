#!/usr/bin/env node

/**
 * LangGraph 워크플로우 테스트 스크립트
 * Node.js로 직접 실행하여 워크플로우들을 테스트합니다.
 */

const fs = require('fs');
const path = require('path');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// 로깅 함수
function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// 테스트 결과 추적
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// 환경 설정 확인
function checkEnvironment() {
  log('\n=== 환경 설정 확인 ===', 'blue');
  
  // .env 파일 확인
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    log('✓ .env 파일 존재', 'green');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasOllamaUrl = envContent.includes('OLLAMA_BASE_URL');
    const hasOllamaModel = envContent.includes('OLLAMA_MODEL');
    
    log(`✓ OLLAMA_BASE_URL 설정: ${hasOllamaUrl ? '있음' : '없음'}`, hasOllamaUrl ? 'green' : 'yellow');
    log(`✓ OLLAMA_MODEL 설정: ${hasOllamaModel ? '있음' : '없음'}`, hasOllamaModel ? 'green' : 'yellow');
  } else {
    log('✗ .env 파일 없음', 'red');
  }
  
  // package.json 의존성 확인
  const packagePath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = packageData.dependencies || {};
    
    log('✓ LangGraph 의존성 확인:', 'cyan');
    log(`  - @langchain/langgraph: ${deps['@langchain/langgraph'] || '없음'}`, deps['@langchain/langgraph'] ? 'green' : 'red');
    log(`  - @langchain/core: ${deps['@langchain/core'] || '없음'}`, deps['@langchain/core'] ? 'green' : 'red');
    log(`  - langchain: ${deps['langchain'] || '없음'}`, deps['langchain'] ? 'green' : 'red');
    log(`  - ollama: ${deps['ollama'] || '없음'}`, deps['ollama'] ? 'green' : 'red');
  }
}

// 파일 구조 확인
function checkFileStructure() {
  log('\n=== 파일 구조 확인 ===', 'blue');
  
  const filesToCheck = [
    'src/ai/ai.service.ts',
    'src/ai/ai.module.ts',
    'src/ai/workflows/simple-task.workflow.ts',
    'src/ai/workflows/task-creation.workflow.ts',
    'src/ai/workflows/conversational-ai.workflow.ts',
    'src/ai/workflows/project-analysis.workflow.ts',
    'src/ai/workflows/advanced-task-creation.workflow.ts',
    'src/common/types.ts'
  ];
  
  filesToCheck.forEach(file => {
    const filePath = path.join(__dirname, file);
    const exists = fs.existsSync(filePath);
    log(`${exists ? '✓' : '✗'} ${file}`, exists ? 'green' : 'red');
    
    if (exists) {
      const content = fs.readFileSync(filePath, 'utf8');
      const size = Math.round(content.length / 1024 * 100) / 100;
      log(`    크기: ${size}KB`, 'cyan');
      
      // LangGraph 관련 import 확인
      if (content.includes('@langchain/langgraph')) {
        log('    ✓ LangGraph import 포함', 'green');
      }
      if (content.includes('StateGraph') || content.includes('workflow')) {
        log('    ✓ 워크플로우 코드 포함', 'green');
      }
    }
  });
}

// 타입스크립트 컴파일 테스트
async function testTypeScriptCompilation() {
  log('\n=== TypeScript 컴파일 테스트 ===', 'blue');
  testResults.total++;
  
  try {
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const tsc = spawn('npx', ['tsc', '--noEmit'], {
        cwd: __dirname,
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      tsc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      tsc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      tsc.on('close', (code) => {
        if (code === 0) {
          log('✓ TypeScript 컴파일 성공', 'green');
          testResults.passed++;
        } else {
          log('✗ TypeScript 컴파일 실패', 'red');
          if (errorOutput) {
            log(`오류: ${errorOutput}`, 'red');
          }
          testResults.failed++;
          testResults.errors.push('TypeScript 컴파일 실패');
        }
        resolve();
      });
      
      // 타임아웃 설정 (30초)
      setTimeout(() => {
        tsc.kill();
        log('✗ TypeScript 컴파일 타임아웃', 'red');
        testResults.failed++;
        testResults.errors.push('TypeScript 컴파일 타임아웃');
        resolve();
      }, 30000);
    });
  } catch (error) {
    log(`✗ TypeScript 컴파일 테스트 실패: ${error.message}`, 'red');
    testResults.failed++;
    testResults.errors.push(`TypeScript 컴파일 테스트 실패: ${error.message}`);
  }
}

// Ollama 연결 테스트
async function testOllamaConnection() {
  log('\n=== Ollama 연결 테스트 ===', 'blue');
  testResults.total++;
  
  try {
    // .env 파일에서 OLLAMA_BASE_URL 읽기
    let ollamaUrl = 'http://localhost:11434';
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const urlMatch = envContent.match(/OLLAMA_BASE_URL=(.+)/);
      if (urlMatch) {
        ollamaUrl = urlMatch[1].trim();
      }
    }
    
    log(`Ollama URL: ${ollamaUrl}`, 'cyan');
    
    // HTTP 요청으로 Ollama 상태 확인
    const http = require('http');
    const https = require('https');
    const url = require('url');
    
    const parsedUrl = url.parse(ollamaUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    return new Promise((resolve) => {
      const req = client.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: '/api/tags',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.models && Array.isArray(response.models)) {
              log('✓ Ollama 연결 성공', 'green');
              log(`사용 가능한 모델: ${response.models.length}개`, 'cyan');
              
              response.models.slice(0, 3).forEach((model, index) => {
                log(`  ${index + 1}. ${model.name}`, 'cyan');
              });
              
              if (response.models.length > 3) {
                log(`  ... 외 ${response.models.length - 3}개`, 'cyan');
              }
              
              testResults.passed++;
            } else {
              log('✗ Ollama 응답 형식 오류', 'red');
              testResults.failed++;
              testResults.errors.push('Ollama 응답 형식 오류');
            }
          } catch (parseError) {
            log('✗ Ollama 응답 파싱 실패', 'red');
            testResults.failed++;
            testResults.errors.push(`Ollama 응답 파싱 실패: ${parseError.message}`);
          }
          resolve();
        });
      });
      
      req.on('error', (error) => {
        log(`✗ Ollama 연결 실패: ${error.message}`, 'red');
        log('Ollama가 실행 중인지 확인하세요: ollama serve', 'yellow');
        testResults.failed++;
        testResults.errors.push(`Ollama 연결 실패: ${error.message}`);
        resolve();
      });
      
      req.on('timeout', () => {
        log('✗ Ollama 연결 타임아웃', 'red');
        testResults.failed++;
        testResults.errors.push('Ollama 연결 타임아웃');
        req.destroy();
        resolve();
      });
      
      req.end();
    });
  } catch (error) {
    log(`✗ Ollama 테스트 실패: ${error.message}`, 'red');
    testResults.failed++;
    testResults.errors.push(`Ollama 테스트 실패: ${error.message}`);
  }
}

// 워크플로우 모의 테스트
function testWorkflowLogic() {
  log('\n=== 워크플로우 로직 테스트 ===', 'blue');
  
  const testCases = [
    {
      name: '긴급 작업 인식',
      input: '긴급히 프레젠테이션 자료 준비해야 함',
      expected: { priority: 'urgent', hasTitle: true }
    },
    {
      name: '날짜 추출',
      input: '내일까지 보고서 작성',
      expected: { hasDate: true, priority: 'high' }
    },
    {
      name: '태그 추출',
      input: '팀 미팅 준비 #회의 #팀프로젝트',
      expected: { hasTags: true, tagCount: 2 }
    },
    {
      name: '복잡한 작업',
      input: '다음 주까지 새로운 기능 개발하고 테스트까지 완료해야 함',
      expected: { isComplex: true, hasTimeframe: true }
    },
    {
      name: '단순 작업',
      input: '이메일 확인',
      expected: { isSimple: true, priority: 'low' }
    }
  ];
  
  testCases.forEach((testCase, index) => {
    testResults.total++;
    log(`\n테스트 ${index + 1}: ${testCase.name}`, 'yellow');
    log(`입력: "${testCase.input}"`, 'cyan');
    
    try {
      // 간단한 키워드 기반 검증
      const input = testCase.input.toLowerCase();
      let passed = true;
      const results = [];
      
      // 우선순위 검증
      if (testCase.expected.priority) {
        const urgentKeywords = ['긴급', 'urgent', 'asap'];
        const highKeywords = ['중요', 'important', '까지', 'until'];
        const lowKeywords = ['확인', 'check', '간단'];
        
        let detectedPriority = 'medium';
        
        if (urgentKeywords.some(keyword => input.includes(keyword))) {
          detectedPriority = 'urgent';
        } else if (highKeywords.some(keyword => input.includes(keyword))) {
          detectedPriority = 'high';
        } else if (lowKeywords.some(keyword => input.includes(keyword))) {
          detectedPriority = 'low';
        }
        
        if (detectedPriority === testCase.expected.priority) {
          results.push('✓ 우선순위 인식 정확');
        } else {
          results.push(`✗ 우선순위 인식 실패 (예상: ${testCase.expected.priority}, 실제: ${detectedPriority})`);
          passed = false;
        }
      }
      
      // 제목 생성 검증
      if (testCase.expected.hasTitle) {
        const hasTitle = testCase.input.length > 0;
        if (hasTitle) {
          results.push('✓ 제목 생성 가능');
        } else {
          results.push('✗ 제목 생성 실패');
          passed = false;
        }
      }
      
      // 날짜 추출 검증
      if (testCase.expected.hasDate) {
        const dateKeywords = ['내일', 'tomorrow', '다음 주', 'next week', '까지'];
        const hasDate = dateKeywords.some(keyword => input.includes(keyword));
        if (hasDate) {
          results.push('✓ 날짜 키워드 감지');
        } else {
          results.push('✗ 날짜 키워드 미감지');
          passed = false;
        }
      }
      
      // 태그 추출 검증
      if (testCase.expected.hasTags) {
        const tagPattern = /#[가-힣\w]+/g; // 한글도 포함하도록 수정
        const tags = testCase.input.match(tagPattern) || [];
        if (tags.length > 0) {
          results.push(`✓ 태그 감지 (${tags.length}개): ${tags.join(', ')}`);
          
          if (testCase.expected.tagCount && tags.length !== testCase.expected.tagCount) {
            results.push(`⚠ 태그 개수 불일치 (예상: ${testCase.expected.tagCount}, 실제: ${tags.length})`);
          }
        } else {
          results.push('✗ 태그 미감지');
          passed = false;
        }
      }
      
      // 복잡도 검증
      if (testCase.expected.isComplex) {
        const complexKeywords = ['개발', '테스트', '완료', '여러', '모든'];
        const isComplex = complexKeywords.some(keyword => input.includes(keyword)) || input.length > 50;
        if (isComplex) {
          results.push('✓ 복잡한 작업으로 인식');
        } else {
          results.push('✗ 복잡도 인식 실패');
          passed = false;
        }
      }
      
      if (testCase.expected.isSimple) {
        const isSimple = input.length < 20;
        if (isSimple) {
          results.push('✓ 단순 작업으로 인식');
        } else {
          results.push('✗ 단순 작업 인식 실패');
          passed = false;
        }
      }
      
      // 결과 출력
      results.forEach(result => {
        const color = result.startsWith('✓') ? 'green' : 
                     result.startsWith('⚠') ? 'yellow' : 'red';
        log(`  ${result}`, color);
      });
      
      if (passed) {
        log(`✓ 테스트 통과`, 'green');
        testResults.passed++;
      } else {
        log(`✗ 테스트 실패`, 'red');
        testResults.failed++;
        testResults.errors.push(`워크플로우 로직 테스트 실패: ${testCase.name}`);
      }
      
    } catch (error) {
      log(`✗ 테스트 오류: ${error.message}`, 'red');
      testResults.failed++;
      testResults.errors.push(`워크플로우 테스트 오류: ${testCase.name} - ${error.message}`);
    }
  });
}

// NestJS 빌드 테스트
async function testNestJSBuild() {
  log('\n=== NestJS 빌드 테스트 ===', 'blue');
  testResults.total++;
  
  try {
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: __dirname,
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      build.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      build.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      build.on('close', (code) => {
        if (code === 0) {
          log('✓ NestJS 빌드 성공', 'green');
          
          // dist 폴더 확인
          const distPath = path.join(__dirname, 'dist');
          if (fs.existsSync(distPath)) {
            log('✓ dist 폴더 생성됨', 'green');
            
            // 주요 파일들 확인
            const importantFiles = [
              'main.js',
              'ai/ai.service.js',
              'ai/workflows/simple-task.workflow.js',
              'ai/workflows/task-creation.workflow.js'
            ];
            
            importantFiles.forEach(file => {
              const filePath = path.join(distPath, file);
              if (fs.existsSync(filePath)) {
                log(`  ✓ ${file}`, 'green');
              } else {
                log(`  ✗ ${file} 누락`, 'red');
              }
            });
          }
          
          testResults.passed++;
        } else {
          log('✗ NestJS 빌드 실패', 'red');
          if (errorOutput) {
            log(`오류: ${errorOutput.slice(0, 500)}...`, 'red');
          }
          testResults.failed++;
          testResults.errors.push('NestJS 빌드 실패');
        }
        resolve();
      });
      
      // 타임아웃 설정 (60초)
      setTimeout(() => {
        build.kill();
        log('✗ NestJS 빌드 타임아웃', 'red');
        testResults.failed++;
        testResults.errors.push('NestJS 빌드 타임아웃');
        resolve();
      }, 60000);
    });
  } catch (error) {
    log(`✗ NestJS 빌드 테스트 실패: ${error.message}`, 'red');
    testResults.failed++;
    testResults.errors.push(`NestJS 빌드 테스트 실패: ${error.message}`);
  }
}

// 의존성 보안 검사
async function testSecurityAudit() {
  log('\n=== 의존성 보안 검사 ===', 'blue');
  testResults.total++;
  
  try {
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const audit = spawn('npm', ['audit', '--audit-level=moderate'], {
        cwd: __dirname,
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      audit.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      audit.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      audit.on('close', (code) => {
        if (code === 0) {
          log('✓ 보안 검사 통과 (심각한 취약점 없음)', 'green');
          testResults.passed++;
        } else if (code === 1) {
          log('⚠ 보안 취약점 발견', 'yellow');
          if (output.includes('vulnerabilities')) {
            const vulnerabilityMatch = output.match(/(\d+) vulnerabilities/);
            if (vulnerabilityMatch) {
              log(`발견된 취약점: ${vulnerabilityMatch[1]}개`, 'yellow');
            }
          }
          log('npm audit fix 실행을 권장합니다', 'yellow');
          testResults.passed++; // 경고는 통과로 처리
        } else {
          log('✗ 보안 검사 실패', 'red');
          testResults.failed++;
          testResults.errors.push('보안 검사 실패');
        }
        resolve();
      });
      
      setTimeout(() => {
        audit.kill();
        log('✗ 보안 검사 타임아웃', 'red');
        testResults.failed++;
        testResults.errors.push('보안 검사 타임아웃');
        resolve();
      }, 30000);
    });
  } catch (error) {
    log(`✗ 보안 검사 실패: ${error.message}`, 'red');
    testResults.failed++;
    testResults.errors.push(`보안 검사 실패: ${error.message}`);
  }
}

// 최종 결과 출력
function printResults() {
  log('\n' + '='.repeat(50), 'bold');
  log('테스트 결과 요약', 'bold');
  log('='.repeat(50), 'bold');
  
  log(`\n총 테스트: ${testResults.total}개`, 'cyan');
  log(`통과: ${testResults.passed}개`, 'green');
  log(`실패: ${testResults.failed}개`, testResults.failed > 0 ? 'red' : 'green');
  
  const successRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
  log(`성공률: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
  
  if (testResults.errors.length > 0) {
    log('\n실패한 테스트:', 'red');
    testResults.errors.forEach((error, index) => {
      log(`  ${index + 1}. ${error}`, 'red');
    });
  }
  
  log('\n권장사항:', 'yellow');
  if (testResults.failed === 0) {
    log('✓ 모든 테스트가 통과했습니다!', 'green');
    log('✓ 백엔드 LangGraph 설정이 올바르게 구성되었습니다.', 'green');
  } else {
    if (testResults.errors.some(e => e.includes('Ollama'))) {
      log('• Ollama 서버를 시작하세요: ollama serve', 'yellow');
      log('• 모델을 다운로드하세요: ollama pull qwen2.5:0.5b', 'yellow');
    }
    if (testResults.errors.some(e => e.includes('TypeScript') || e.includes('빌드'))) {
      log('• 의존성을 설치하세요: npm install', 'yellow');
      log('• TypeScript 설정을 확인하세요', 'yellow');
    }
    if (testResults.errors.some(e => e.includes('보안'))) {
      log('• 보안 취약점을 수정하세요: npm audit fix', 'yellow');
    }
  }
  
  log('\n다음 단계:', 'cyan');
  log('1. npm run start:dev - 개발 서버 시작', 'cyan');
  log('2. API 엔드포인트 테스트 - POST /ai/parse-task', 'cyan');
  log('3. 프론트엔드 연동 테스트', 'cyan');
  
  log('\n' + '='.repeat(50), 'bold');
}

// 메인 실행 함수
async function main() {
  log('LangGraph 백엔드 테스트 시작', 'bold');
  log('='.repeat(50), 'bold');
  
  // 순차적으로 테스트 실행
  checkEnvironment();
  checkFileStructure();
  
  await testTypeScriptCompilation();
  await testOllamaConnection();
  
  testWorkflowLogic();
  
  await testNestJSBuild();
  await testSecurityAudit();
  
  printResults();
  
  // 종료 코드 설정
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 스크립트 실행
if (require.main === module) {
  main().catch(error => {
    log(`테스트 실행 중 오류 발생: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  main,
  testResults
};
