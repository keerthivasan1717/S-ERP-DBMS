import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`S-ERP Server listening on port ${env.PORT} (mode: ${env.NODE_ENV})`);
  console.log(`Engines configured:`);
  console.log(`- MySQL 8.4: ${env.MYSQL_HOST}:${env.MYSQL_PORT}/${env.MYSQL_DATABASE}`);
  console.log(`- PostgreSQL 16: ${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
