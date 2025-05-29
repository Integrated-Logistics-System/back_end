import { Client } from '@elastic/elasticsearch';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ElasticsearchService {
  private client: Client;

  constructor() {
    this.client = new Client({ node: 'http://192.168.0.111:9200' });
  }

  async search(params: any) {
    return await this.client.search(params);
  }

  getClient() {
    return this.client;
  }
}
