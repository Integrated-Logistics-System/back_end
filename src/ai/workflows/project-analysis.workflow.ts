import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";

interface ProjectAnalysisState {
  projectId: string;
  projectData: any;
  analysisType: string;
  insights: any;
  recommendations: string[];
  risks: string[];
  metrics: any;
  confidence: number;
}

export interface ProjectAnalysisResult {
  summary: string;
  insights: any;
  recommendations: string[];
  risks: string[];
  metrics: any;
  confidence: number;
}

@Injectable()
export class ProjectAnalysisWorkflow {
  private readonly logger = new Logger(ProjectAnalysisWorkflow.name);
  private readonly ollama: Ollama;

  constructor(private configService: ConfigService) {
    this.ollama = new Ollama({
      host: this.configService.get<string>("OLLAMA_BASE_URL") || "http://localhost:11434",
    });
  }

  async analyzeProject(
    projectId: string,
    projectData: any,
    analysisType: string = "comprehensive"
  ): Promise<ProjectAnalysisResult> {
    this.logger.debug(`🔍 Starting project analysis for: ${projectId}`);

    const initialState: ProjectAnalysisState = {
      projectId,
      projectData,
      analysisType,
      insights: {},
      recommendations: [],
      risks: [],
      metrics: {},
      confidence: 0,
    };

    try {
      // 순차적 분석 워크플로우
      let state = await this.calculateMetrics(initialState);
      state = await this.identifyRisks(state);
      state = await this.generateInsights(state);
      state = await this.createRecommendations(state);

      return {
        summary: this.generateSummary(state),
        insights: state.insights,
        recommendations: state.recommendations,
        risks: state.risks,
        metrics: state.metrics,
        confidence: state.confidence,
      };
    } catch (error) {
      this.logger.error(`Project analysis failed: ${error}`);
      
      return {
        summary: "프로젝트 분석 중 오류가 발생했습니다.",
        insights: {},
        recommendations: ["나중에 다시 시도해주세요."],
        risks: [],
        metrics: {},
        confidence: 0.1,
      };
    }
  }

  private async calculateMetrics(state: ProjectAnalysisState): Promise<ProjectAnalysisState> {
    this.logger.debug("📊 Step 1: Calculating project metrics");

    const data = state.projectData;
    
    // 기본 메트릭 계산
    const totalTasks = data.tasks?.length || 0;
    const completedTasks = data.tasks?.filter((t: any) => t.status === 'completed').length || 0;
    const overdueTasks = data.tasks?.filter((t: any) => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length || 0;
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;

    const metrics = {
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate: Math.round(completionRate * 100) / 100,
      overdueRate: Math.round(overdueRate * 100) / 100,
      averageTaskDuration: this.calculateAverageTaskDuration(data.tasks || []),
      projectHealth: this.calculateProjectHealth(completionRate, overdueRate),
    };

    return {
      ...state,
      metrics,
      confidence: 0.8, // 메트릭 계산은 신뢰도가 높음
    };
  }

  private async identifyRisks(state: ProjectAnalysisState): Promise<ProjectAnalysisState> {
    this.logger.debug("⚠️ Step 2: Identifying project risks");

    const risks: string[] = [];
    const metrics = state.metrics;

    // 위험 요소 식별
    if (metrics.overdueRate > 30) {
      risks.push("높은 지연율: 프로젝트 일정이 크게 밀리고 있습니다");
    }

    if (metrics.completionRate < 50 && state.projectData.dueDate) {
      const daysToDeadline = this.calculateDaysToDeadline(state.projectData.dueDate);
      if (daysToDeadline < 30) {
        risks.push("마감일 위험: 현재 진행률로는 마감일 내 완료가 어려울 수 있습니다");
      }
    }

    if (metrics.averageTaskDuration > 5) {
      risks.push("작업 복잡도 높음: 평균 작업 소요 시간이 예상보다 깁니다");
    }

    // AI를 통한 추가 위험 분석
    try {
      const prompt = `다음 프로젝트 데이터를 분석하여 추가 위험 요소를 식별하세요:

완료율: ${metrics.completionRate}%
지연율: ${metrics.overdueRate}%
총 작업 수: ${metrics.totalTasks}
프로젝트 상태: ${metrics.projectHealth}

JSON 형식으로 추가 위험 요소를 응답하세요:
{
  "additionalRisks": ["위험요소1", "위험요소2"],
  "severity": "high|medium|low",
  "confidence": 0.0-1.0
}`;

      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt,
        stream: false,
      });

      const riskAnalysis = this.parseJSON(response.response);
      if (riskAnalysis.additionalRisks) {
        risks.push(...riskAnalysis.additionalRisks);
      }
    } catch (error) {
      this.logger.warn(`AI risk analysis failed: ${error}`);
    }

    return {
      ...state,
      risks,
    };
  }

  private async generateInsights(state: ProjectAnalysisState): Promise<ProjectAnalysisState> {
    this.logger.debug("💡 Step 3: Generating insights");

    const prompt = `프로젝트 분석 결과를 바탕으로 핵심 인사이트를 제공하세요:

프로젝트 메트릭:
- 완료율: ${state.metrics.completionRate}%
- 지연율: ${state.metrics.overdueRate}%
- 총 작업: ${state.metrics.totalTasks}개
- 프로젝트 상태: ${state.metrics.projectHealth}

식별된 위험:
${state.risks.map(risk => `- ${risk}`).join('\n')}

JSON 형식으로 응답:
{
  "keyInsights": {
    "performance": "성과 분석",
    "efficiency": "효율성 분석", 
    "teamProductivity": "팀 생산성 분석",
    "bottlenecks": "병목 구간 분석"
  },
  "confidence": 0.0-1.0
}`;

    try {
      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt,
        stream: false,
      });

      const insights = this.parseJSON(response.response);
      
      return {
        ...state,
        insights: insights.keyInsights || {},
        confidence: Math.min(state.confidence + (insights.confidence || 0.3), 1.0),
      };
    } catch (error) {
      this.logger.error(`Insight generation failed: ${error}`);
      return {
        ...state,
        insights: {
          performance: "분석 중 오류 발생",
          efficiency: "데이터 부족으로 분석 불가",
        },
      };
    }
  }

  private async createRecommendations(state: ProjectAnalysisState): Promise<ProjectAnalysisState> {
    this.logger.debug("🎯 Step 4: Creating recommendations");

    const recommendations: string[] = [];

    // 메트릭 기반 권장사항
    if (state.metrics.overdueRate > 20) {
      recommendations.push("일정 관리 개선: 작업 우선순위를 재검토하고 리소스 배분을 조정하세요");
    }

    if (state.metrics.completionRate < 70) {
      recommendations.push("진행률 향상: 작업을 더 작은 단위로 분할하여 완료 가능성을 높이세요");
    }

    if (state.metrics.averageTaskDuration > 3) {
      recommendations.push("작업 복잡도 관리: 복잡한 작업들을 세분화하여 관리 효율성을 높이세요");
    }

    // AI 기반 맞춤형 권장사항
    try {
      const prompt = `프로젝트 상황에 맞는 구체적인 개선 방안을 제시하세요:

현재 상황:
- 완료율: ${state.metrics.completionRate}%
- 위험 요소: ${state.risks.length}개
- 프로젝트 상태: ${state.metrics.projectHealth}

JSON 응답:
{
  "actionableRecommendations": [
    "구체적인 실행 방안 1",
    "구체적인 실행 방안 2", 
    "구체적인 실행 방안 3"
  ],
  "priority": "high|medium|low"
}`;

      const response = await this.ollama.generate({
        model: this.configService.get<string>("OLLAMA_MODEL") || "qwen2.5:0.5b",
        prompt,
        stream: false,
      });

      const aiRecommendations = this.parseJSON(response.response);
      if (aiRecommendations.actionableRecommendations) {
        recommendations.push(...aiRecommendations.actionableRecommendations);
      }
    } catch (error) {
      this.logger.warn(`AI recommendation generation failed: ${error}`);
    }

    return {
      ...state,
      recommendations,
    };
  }

  private calculateAverageTaskDuration(tasks: any[]): number {
    if (!tasks.length) return 0;
    
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.estimatedDuration);
    if (!completedTasks.length) return 0;
    
    const totalDuration = completedTasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0);
    return Math.round((totalDuration / completedTasks.length) * 100) / 100;
  }

  private calculateProjectHealth(completionRate: number, overdueRate: number): string {
    if (completionRate > 80 && overdueRate < 10) return "excellent";
    if (completionRate > 60 && overdueRate < 20) return "good";
    if (completionRate > 40 && overdueRate < 30) return "fair";
    return "poor";
  }

  private calculateDaysToDeadline(dueDate: string): number {
    const deadline = new Date(dueDate);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private generateSummary(state: ProjectAnalysisState): string {
    const metrics = state.metrics;
    const healthStatus = {
      excellent: "매우 양호",
      good: "양호", 
      fair: "보통",
      poor: "개선 필요"
    }[metrics.projectHealth] || "알 수 없음";

    return `프로젝트 상태: ${healthStatus} | 완료율: ${metrics.completionRate}% | 지연율: ${metrics.overdueRate}% | 총 작업: ${metrics.totalTasks}개`;
  }

  private parseJSON(jsonString: string): any {
    try {
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      this.logger.warn(`JSON parsing failed: ${error}`);
      return {};
    }
  }
}
