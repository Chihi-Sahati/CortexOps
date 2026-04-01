import IORedis from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';

const connection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null }
);

export const executionQueue = new Queue('workflow-executions', { connection });

export const selfHealQueue = new Queue('self-healing', { connection });

export const notificationQueue = new Queue('notifications', { connection });

export type ExecutionJobData = {
  workflowId: string;
  executionId: string;
  triggeredBy: string;
  inputData?: Record<string, unknown>;
};

export type SelfHealJobData = {
  executionId: string;
  stepId: string;
  errorCode: number;
  errorMessage: string;
  nodeType: string;
  attempt: number;
};

export type NotificationJobData = {
  type: 'email' | 'slack' | 'webhook';
  to: string | string[];
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export { Job };
