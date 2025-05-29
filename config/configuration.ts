export default () => ({
  // MongoDB
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/real_estate_db',
  port: parseInt(process.env.PORT || '3000', 10),

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },

  // Elasticsearch
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },

  // Ollama & LangChain
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'gemma3:1b-it-qat',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'mxbai-embed-large',
  },

  // Naver API
  naver: {
    clientId: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
  },

  // RAG 설정
  rag: {
    maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS || '50', 10),
    cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10),
  },
});
