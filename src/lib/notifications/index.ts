import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendEmail, getEmailTemplate } from '@/lib/notifications/email';

const connection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null }
);

export const notificationQueue = new Queue('notifications', { connection });

export async function sendWorkflowNotification(
  type: 'execution_success' | 'execution_failure' | 'workflow_report',
  data: Record<string, unknown>,
  recipients: string | string[]
) {
  const template = getEmailTemplate(type, data);

  await notificationQueue.add('send-email', {
    type: 'email',
    to: recipients,
    subject: template.subject,
    html: template.html,
  });
}

export function startNotificationWorker() {
  const worker = new Worker(
    'notifications',
    async (job: Job) => {
      const { type, to, subject, html, text } = job.data;

      if (type === 'email') {
        return sendEmail({ to, subject, html, text });
      }

      if (type === 'slack') {
        const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
        if (!SLACK_WEBHOOK_URL) {
          console.warn('SLACK_WEBHOOK_URL not configured');
          return { success: false, error: 'Slack not configured' };
        }

        await fetch(SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: subject || html }),
        });
        return { success: true };
      }

      if (type === 'webhook') {
        const { url, payload } = job.data;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return { success: true };
      }

      return { success: false, error: 'Unknown notification type' };
    },
    {
      connection,
      concurrency: 10,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 100 },
    }
  );

  worker.on('completed', (job) => {
    console.log(`📧 Notification sent: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Notification failed: ${job?.id}`, err.message);
  });

  return worker;
}
