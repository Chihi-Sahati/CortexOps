import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null }
);

export const schedulerQueue = new Queue('scheduled-workflows', { connection });

export interface ScheduleOptions {
  workflowId: string;
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
}

export async function scheduleWorkflow(options: ScheduleOptions): Promise<string> {
  const { workflowId, cronExpression, timezone } = options;

  await unscheduleWorkflow(workflowId);

  const job = await schedulerQueue.add(
    `cron:${workflowId}`,
    { workflowId, triggeredBy: 'scheduler' },
    {
      repeat: {
        pattern: cronExpression,
        tz: timezone || 'UTC',
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  return job.id || workflowId;
}

export async function unscheduleWorkflow(workflowId: string): Promise<void> {
  const repeatableJobs = await schedulerQueue.getRepeatableJobs();

  for (const job of repeatableJobs) {
    if (job.name === `cron:${workflowId}`) {
      await schedulerQueue.removeRepeatableByKey(job.key);
    }
  }
}

export async function getScheduledWorkflows(): Promise<Array<{
  workflowId: string;
  pattern: string;
  next: Date | null;
}>> {
  const jobs = await schedulerQueue.getRepeatableJobs();

  return jobs.map((job) => ({
    workflowId: job.name.replace('cron:', ''),
    pattern: job.pattern || '',
    next: job.next ? new Date(job.next) : null,
  }));
}

export function startSchedulerWorker() {
  const worker = new Worker(
    'scheduled-workflows',
    async (job: Job) => {
      const { workflowId, triggeredBy } = job.data;

      console.log(`⏰ Scheduled execution: Workflow ${workflowId}`);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/workflows/${workflowId}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': process.env.INTERNAL_API_KEY || 'dev-key',
          },
          body: JSON.stringify({ triggeredBy: 'cron' }),
        }
      );

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      return await response.json();
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Scheduled job completed: ${job.name}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Scheduled job failed: ${job?.name}`, error.message);
  });

  return worker;
}
