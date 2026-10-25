import { app } from './app.js';
import { config } from './config/index.js';
import { pool } from './database/index.js';

async function startServer() {
  try {
    // Verify database connectivity
    await pool.query('SELECT 1');
    console.log('[DATABASE] PostgreSQL connected successfully.');

    const server = app.listen(config.port, () => {
      console.log(`[SERVER] Oscar Dog Hotel API running on http://localhost:${config.port}`);
      console.log(`[OPENAPI] Interactive Swagger UI: http://localhost:${config.port}/api/v1/docs`);
    });

    const shutdown = async () => {
      console.log('\n[SHUTDOWN] Closing server and database pool...');
      server.close(async () => {
        await pool.end();
        console.log('[SHUTDOWN] Completed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
