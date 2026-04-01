import { createServer } from 'http';
import type { Server as HTTPServer } from 'http';
import { startWorkers } from '@/lib/queue/worker';
import { startSchedulerWorker } from '@/lib/scheduler';
import { startNotificationWorker } from '@/lib/notifications';
import { initSocketServer } from '@/lib/websocket/server';

export function startCortexOps(app: HTTPServer) {
  const httpServer = createServer(app);

  // Initialize WebSocket
  const io = initSocketServer(httpServer);

  // Start workers
  startWorkers();
  startSchedulerWorker();
  startNotificationWorker();

  console.log('🚀 CortexOps server starting...');
  console.log('✅ Workers initialized');
  console.log('✅ WebSocket server initialized');
  console.log('✅ Scheduler initialized');
  console.log('✅ Notification system initialized');

  return httpServer;
}
