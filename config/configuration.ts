export default () => ({
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/real_estate_db',
  port: parseInt(process.env.PORT || '3000', 10),
});
