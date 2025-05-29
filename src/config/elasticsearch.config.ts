import { ConfigModule, ConfigService } from "@nestjs/config";
import { ElasticsearchModuleAsyncOptions } from "@nestjs/elasticsearch";

export const elasticsearchConfig = (): ElasticsearchModuleAsyncOptions => ({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {
    const username = configService.get<string>("ELASTICSEARCH_USERNAME");
    const password = configService.get<string>("ELASTICSEARCH_PASSWORD");

    const config: {
      node: string;
      auth?: { username: string; password: string };
    } = {
      node:
        configService.get<string>("ELASTICSEARCH_NODE") ||
        "http://localhost:9200",
    };

    // Only add auth if both username and password are provided
    if (username && password) {
      config.auth = {
        username,
        password,
      };
    }

    return config;
  },
  inject: [ConfigService],
});
