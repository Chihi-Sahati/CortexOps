#!/usr/bin/env node

/**
 * CortexOps Worker Process
 * 
 * This script starts all background workers for CortexOps:
 * - Execution Worker (processes workflow executions)
 * - Self-Healing Worker (handles automatic error recovery)
 * - Notification Worker (sends emails, Slack messages, webhooks)
 * - Scheduler Worker (handles cron-based workflow triggers)
 * 
 * Usage:
 *   npm run workers
 *   node dist/workers.js
 */

import { startWorkers } from './lib/queue/worker';
import { startSchedulerWorker } from './lib/scheduler';
import { startNotificationWorker } from './lib/notifications';

console.log('🚀 Starting CortexOps Workers...');
console.log('');

// Start all workers
startWorkers();
startSchedulerWorker();
startNotificationWorker();

console.log('');
console.log('✅ All workers started successfully');
console.log('   - Execution Worker (concurrency: 5)');
console.log('   - Self-Healing Worker (concurrency: 3)');
console.log('   - Notification Worker (concurrency: 10)');
console.log('   - Scheduler Worker (concurrency: 5)');
console.log('');
console.log('📊 Workers are listening for jobs...');

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down workers...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down workers...');
  process.exit(0);
});
