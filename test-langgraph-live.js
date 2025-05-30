#!/usr/bin/env node

/**
 * LangGraph 워크플로우 실제 기능 테스트
 * 실제 Ollama와 연동하여 워크플로우 동작을 확인합니다.
 */

const { spawn } = require('child_process');
const http = require('http');
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
  bold: '\x1b[1m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

let serverProcess = null;
let serverReady = false;

// 서버 시작
async function startServer() {
  log('\n🚀 NestJS 서버 시작 중...', 'blue');
  
  return new Promise((resolve, reject) => {
    serverProcess = spawn('npm', ['run', 'start:dev'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let startupOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      
      // 서버가 준비되었는지 확인
      if (output.includes('Nest application successfully started') || 
          output.includes('Application is running on')) {
        serverReady = true;
        log('✓ 서버가 성공적으로 시작되었습니다', 'green');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error') || error.includes('error')) {
        log(`서버 오류: ${error}`, 'red');
      }
    });

    serverProcess.on('close', (code) => {
      if (code !== 0 && !serverReady) {
        reject(new Error(`Server failed to start with code ${code}`));
      }
    });

    // 30초 타임아웃
    setTimeout(() => {
      if (!serverReady) {
        log('서버 시작 확인 중... (startup log 확인)', 'yellow');
        log('Startup output:', 'cyan');
        console.log(startupOutput);
        resolve(); // 타임아웃되어도 계속 진행
      }
    }, 30000);
  });
}

// 서버 종료
function stopServer() {
  if (serverProcess) {
    log('\n🛑 서버를 종료합니다...', 'yellow');
    serverProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

// API 테스트 함수
async function testAPI(endpoint, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: response,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// 워크플로우 테스트 케이스들
const workflowTests = [
  {
    name: "간단한 작업 생성",
    endpoint: "/ai/parse-task",
    data: { input: "내일까지 회의 자료 준비하기" },
    expectation: {
      hasResult: true,
      hasProcessingTime: true
    }
  },
  {
    name: "고급 작업 생성 워크플로우",
    endpoint: "/ai/advanced-task-creation", 
    data: { 
      input: "긴급히 새로운 마케팅 캠페인 기획하고 예산 승인받아야 함 #마케팅 #캠페인",
      userId: "test-user-123"
    },
    expectation: {
      hasResult: true,
      hasProcessingTime: true,
      hasWorkflow: true
    }
  },
  {
    name: "대화형 AI 워크플로우",
    endpoint: "/ai/conversation",
    data: { 
      message: "오늘 해야 할 일이 뭐가 있나요?",
      conversationHistory: [],
      context: {}
    },
    expectation: {
      hasResponse: true,
      hasDetectedIntent: true,
      hasConfidence: true
    }
  },
  {
    name: "우선순위 제안",
    endpoint: "/ai/suggest-priority",
    data: {
      title: "고객 프레젠테이션 준비",
      description: "중요한 클라이언트 미팅을 위한 프레젠테이션",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    expectation: {
      hasSuggestion: true,
      hasProcessingTime: true
    }
  },
  {
    name: "간단한 워크플로우 테스트",
    endpoint: "/ai/test-workflow",
    data: { input: "프로젝트 계획서 작성" },
    expectation: {
      hasResult: true,
      hasProcessingTime: true
    }
  }
];

// 개별 워크플로우 테스트 실행
async function runWorkflowTest(test) {
  log(`\n🧪 테스트: ${test.name}`, 'magenta');
  log(`엔드포인트: ${test.endpoint}`, 'cyan');
  log(`데이터: ${JSON.stringify(test.data, null, 2)}`, 'cyan');
  
  try {
    const result = await testAPI(test.endpoint, 'POST', test.data);
    
    log(`상태 코드: ${result.statusCode}`, result.statusCode === 200 ? 'green' : 'red');
    
    if (result.statusCode === 200) {
      log(`응답:`, 'cyan');
      console.log(JSON.stringify(result.data, null, 2));
      
      // 기대값 검증
      let passed = true;
      const checks = [];
      
      if (test.expectation.hasResult && !result.data.result) {
        checks.push("❌ result 없음");
        passed = false;
      } else if (test.expectation.hasResult) {
        checks.push("✅ result 있음");
      }
      
      if (test.expectation.hasProcessingTime && !result.data.processingTime) {
        checks.push("❌ processingTime 없음");
        passed = false;
      } else if (test.expectation.hasProcessingTime) {
        checks.push(`✅ 처리시간: ${result.data.processingTime}`);
      }
      
      if (test.expectation.hasWorkflow && !result.data.workflow) {
        checks.push("❌ workflow 정보 없음");
        passed = false;
      } else if (test.expectation.hasWorkflow) {
        checks.push(`✅ 워크플로우: ${result.data.workflow}`);
      }
      
      if (test.expectation.hasResponse && !result.data.response) {
        checks.push("❌ 응답 없음");
        passed = false;
      } else if (test.expectation.hasResponse) {
        checks.push("✅ 응답 있음");
      }
      
      if (test.expectation.hasDetectedIntent && !result.data.detectedIntent) {
        checks.push("❌ 의도 감지 없음");
        passed = false;
      } else if (test.expectation.hasDetectedIntent) {
        checks.push(`✅ 의도: ${result.data.detectedIntent}`);
      }
      
      if (test.expectation.hasConfidence && typeof result.data.confidence !== 'number') {
        checks.push("❌ 신뢰도 점수 없음");
        passed = false;
      } else if (test.expectation.hasConfidence) {
        checks.push(`✅ 신뢰도: ${result.data.confidence}`);
      }
      
      if (test.expectation.hasSuggestion && !result.data.suggestion) {
        checks.push("❌ 제안사항 없음");
        passed = false;
      } else if (test.expectation.hasSuggestion) {
        checks.push("✅ 제안사항 있음");
      }
      
      log('\n검증 결과:', 'yellow');
      checks.forEach(check => log(`  ${check}`, 'white'));
      
      if (passed) {
        log(`\n✅ ${test.name} 테스트 통과!`, 'green');
        return true;
      } else {
        log(`\n❌ ${test.name} 테스트 실패`, 'red');
        return false;
      }
    } else {
      log(`❌ API 호출 실패: ${result.data}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 테스트 실행 오류: ${error.message}`, 'red');
    return false;
  }
}

// 서버 상태 확인
async function checkServerHealth() {
  try {
    const result = await testAPI('/', 'GET');
    if (result.statusCode === 200) {
      log('✅ 서버가 정상적으로 응답합니다', 'green');
      return true;
    } else {
      log(`❌ 서버 응답 이상: ${result.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 서버 연결 실패: ${error.message}`, 'red');
    return false;
  }
}

// 메인 테스트 실행
async function main() {
  log('🔥 LangGraph 워크플로우 실제 기능 테스트 시작', 'bold');
  log('='.repeat(60), 'bold');
  
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  try {
    // 1. 서버 시작
    await startServer();
    
    // 잠시 대기 (서버 완전 준비)
    log('\n⏳ 서버 초기화 대기 중... (10초)', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 2. 서버 상태 확인
    const serverOk = await checkServerHealth();
    if (!serverOk) {
      throw new Error('서버가 정상적으로 응답하지 않습니다');
    }
    
    // 3. 워크플로우 테스트 실행
    log('\n🧪 워크플로우 기능 테스트 시작', 'blue');
    
    for (const test of workflowTests) {
      testResults.total++;
      const success = await runWorkflowTest(test);
      
      if (success) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
      
      // 테스트 간 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 4. 결과 요약
    log('\n' + '='.repeat(60), 'bold');
    log('🎯 테스트 결과 요약', 'bold');
    log('='.repeat(60), 'bold');
    
    log(`\n📊 총 테스트: ${testResults.total}개`, 'cyan');
    log(`✅ 성공: ${testResults.passed}개`, 'green');
    log(`❌ 실패: ${testResults.failed}개`, testResults.failed > 0 ? 'red' : 'green');
    
    const successRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
    log(`📈 성공률: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
    
    if (testResults.failed === 0) {
      log('\n🎉 모든 워크플로우가 정상 동작합니다!', 'green');
      log('🚀 백엔드 LangGraph 시스템이 준비되었습니다.', 'green');
    } else {
      log('\n⚠️  일부 워크플로우에 문제가 있습니다.', 'yellow');
      log('🔧 API 엔드포인트나 워크플로우 로직을 확인해주세요.', 'yellow');
    }
    
    log('\n📋 다음 단계:', 'cyan');
    log('1. 프론트엔드 연동 테스트', 'cyan');
    log('2. 실제 사용자 시나리오 테스트', 'cyan');
    log('3. 성능 최적화', 'cyan');
    log('4. 프로덕션 배포', 'cyan');
    
  } catch (error) {
    log(`\n💥 테스트 실행 실패: ${error.message}`, 'red');
    testResults.failed = testResults.total || 1;
  } finally {
    // 서버 종료
    stopServer();
    
    // 종료 코드 설정
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// 인터럽트 처리
process.on('SIGINT', () => {
  log('\n\n⚡ 테스트 중단됨', 'yellow');
  stopServer();
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\n🛑 테스트 종료됨', 'yellow');
  stopServer();
  process.exit(143);
});

// 스크립트 실행
if (require.main === module) {
  main().catch(error => {
    log(`💥 예상치 못한 오류: ${error.message}`, 'red');
    stopServer();
    process.exit(1);
  });
}

module.exports = { main, testResults: () => testResults };
