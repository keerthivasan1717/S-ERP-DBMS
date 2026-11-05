import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`S-ERP Server listening on port ${env.PORT} (mode: ${env.NODE_ENV})`);
  console.log(`Engines configured:`);
  console.log(`- SQL (MySQL 8.4): ${env.MYSQL_HOST}:${env.MYSQL_PORT}/${env.MYSQL_DATABASE}`);
  console.log(`- NoSQL (MongoDB 6.0): ${env.MONGO_HOST}:${env.MONGO_PORT}/${env.MONGO_DATABASE}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
