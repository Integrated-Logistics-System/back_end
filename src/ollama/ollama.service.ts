import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

type OllamaResponseItem = {
  model: string;
  response: string;
  done: boolean;
};

@Injectable()
export class OllamaService {
  private baseUrl = 'http://localhost:11434';

  async generateText(prompt: string, model = 'qwen3:1.7b'): Promise<string> {
    const response: AxiosResponse<OllamaResponseItem[]> = await axios.post(
      `${this.baseUrl}/api/generate`,
      {
        model,
        prompt,
        stream: false,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    // Ollama API의 응답이 배열이 아닐 수도 있으니, 배열/객체 모두 대응
    const data = response.data;

    let result: string | undefined;

    if (Array.isArray(data)) {
      // 배열 응답: [ { model, response, ... } ]
      if (data.length > 0 && typeof data[0].response === 'string') {
        result = data[0].response;
      }
    } else if (
      typeof data === 'object' &&
      data !== null &&
      'response' in data
    ) {
      // 객체 응답: { ... , response: "..." }
      const obj = data as { response?: unknown };
      if (typeof obj.response === 'string') {
        result = obj.response;
      }
    }

    if (!result) {
      throw new Error('Unexpected Ollama response format');
    }

    // response에 마크다운 코드블록(```json ... ```)이 포함되어 있으면 순수 JSON만 추출
    const codeBlockMatch = result.match(/```(?:json)?\n?([\s\S]*?)```/i);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    return result.trim();
  }

  async prompt(prompt: string, model = 'gemma3:1b-it-qat'): Promise<string> {
    return this.generateText(prompt, model);
  }
}
