import './src/config/env.js';
import app from './app.js';
import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import redis from './src/config/redis.js';
import { schedulerService } from './src/services/scheduler.service.js';
import { execSync } from 'child_process';

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Safely releases the target port if occupied by a zombie or previous Node process
 */
function freePort(port) {
  if (process.env.NODE_ENV === 'production') return;
  try {
    if (process.platform === 'win32') {
      const result = execSync(
        `netstat -ano -p tcp`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const lines = result.trim().split('\n');
      const pids = new Set();
      const portRegex = new RegExp(`:${port}\\s+.*LISTENING\\s+(\\d+)`, 'i');

      for (const line of lines) {
        const match = line.match(portRegex);
        if (match && match[1]) {
          const pid = match[1].trim();
          if (pid && pid !== '0' && pid !== String(process.pid)) {
            pids.add(pid);
          }
        }
      }

      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`🧹 Port ${port} released (terminated zombie PID ${pid})`);
        } catch (_) {}
      }
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`);
    }
  } catch (_) {}
}

process.on('uncaughtException', (err) => {
  console.error('🚨 Non-fatal Uncaught Exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('🚨 Non-fatal Unhandled Promise Rejection:', reason);
});

let isListening = false;
let server = null;
let retryCount = 0;
const MAX_PORT_RETRIES = 2;

const startServer = () => {
  if (isListening) return;

  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is not defined in environment. Using default secure key fallback.');
  }

  server = app.listen(PORT, HOST, () => {
    isListening = true;
    const redisStatus = redis && (redis.status === 'ready' || redis.status === 'connect') ? 'Connected' : 'Offline (Bypassed)';
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected to Atlas' : 'Connecting';

    console.log(`\n==================================================`);
    console.log(`  🚀 Redpex CRM Backend Server is ACTIVE!`);
    console.log(`  Environment       : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Host Binding      : ${HOST}`);
    console.log(`  Listening on Port : ${PORT}`);
    console.log(`  Database Status   : ${dbStatus}`);
    console.log(`  Redis Cache Status: ${redisStatus}`);
    console.log(`  Health Check URL  : http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/health`);
    console.log(`==================================================\n`);

    // Initialize scheduler only once after server starts
    if (!global.schedulerStarted) {
      global.schedulerStarted = true;
      try {
        schedulerService.start();
      } catch (err) {
        console.error('❌ Failed to start scheduler:', err.message);
      }
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (retryCount < MAX_PORT_RETRIES) {
        retryCount++;
        console.warn(`⚠️ Port ${PORT} is occupied. Attempting auto-release (attempt ${retryCount}/${MAX_PORT_RETRIES})...`);
        freePort(PORT);
        isListening = false;
        setTimeout(() => {
          startServer();
        }, 1200);
      } else {
        console.error(`🚨 FATAL: Port ${PORT} is already in use by another application. Please free port ${PORT} or configure a different PORT in .env.`);
        process.exit(1);
      }
    } else {
      console.error('🚨 HTTP Server Error:', err.message);
      process.exit(1);
    }
  });
};

// Graceful shutdown on nodemon restart (SIGUSR2) or container termination (SIGINT, SIGTERM)
const handleGracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down HTTP server gracefully...`);
  if (server) {
    server.close(async () => {
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close(false);
          console.log('✅ MongoDB connection closed.');
        }
        if (redis && typeof redis.quit === 'function' && redis.status === 'ready') {
          await redis.quit();
          console.log('✅ Redis connection closed.');
        }
      } catch (err) {
        console.warn('⚠️ Error during graceful connection cleanup:', err.message);
      }
      console.log('✅ Redpex CRM Backend terminated cleanly.');
      if (signal === 'SIGUSR2') {
        process.kill(process.pid, 'SIGUSR2');
      } else {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }
};

process.once('SIGUSR2', () => handleGracefulShutdown('SIGUSR2'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

/**
 * Clean linear async startup bootstrap
 */
async function bootstrap() {
  try {
    console.log('⏳ Connecting to MongoDB Atlas database...');
    await connectDB();
    startServer();
  } catch (err) {
    console.error('❌ CRITICAL BACKEND STARTUP ERROR: Database connection failed.');
    console.error('   Details:', err.message);
    process.exit(1);
  }
}

bootstrap();
